import { CosmosClient, Database, Container } from '@azure/cosmos';
import { Event, EventRegistration } from '../models/Event';
import { User } from '../models/User';
import { ChatMessage } from '../models/Chat';
import { Photo } from '../models/Photo';

export class CosmosService {
    private client: CosmosClient;
    private database: Database;
    private eventsContainer: Container;
    private eventsPartitionKeyPath: string;
    private usersContainer: Container;
    private registrationsContainer: Container;
    private chatContainer: Container;
    private photosContainer: Container;
    private initializationPromise: Promise<void> | null = null;

    constructor() {
        const databaseId = process.env.COSMOS_DB_DATABASE || 'CampusConnectDB';

        // Support either a connection string (AccountEndpoint=...;AccountKey=...;)
        // or separate endpoint/key environment variables.
        const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
        let endpoint = process.env.COSMOS_DB_ENDPOINT;
        let key = process.env.COSMOS_DB_KEY;

        if (connectionString && (!endpoint || !key)) {
            const parsed = this.parseConnectionString(connectionString);
            endpoint = parsed.endpoint || endpoint;
            key = parsed.key || key;
        }

        if (!endpoint || !key) {
            throw new Error('Cosmos DB configuration is missing. Provide COSMOS_DB_CONNECTION_STRING or COSMOS_DB_ENDPOINT and COSMOS_DB_KEY.');
        }

        this.client = new CosmosClient({ endpoint, key });
        this.database = this.client.database(databaseId);
        this.eventsPartitionKeyPath = process.env.COSMOS_DB_EVENTS_PK_PATH || '/id';
        
        // Containers will be assigned during initialize()
        this.eventsContainer = this.database.container('Events');
        this.usersContainer = this.database.container('Users');
        this.registrationsContainer = this.database.container('Registrations');
        this.chatContainer = this.database.container('ChatMessages');
        this.photosContainer = this.database.container('Photos');
    }

    private parseConnectionString(connectionString: string): { endpoint?: string; key?: string } {
        // Expected format: AccountEndpoint=...;AccountKey=...; (case-insensitive keys)
        const parts = connectionString.split(';').map(p => p.trim()).filter(Boolean);
        const map: Record<string, string> = {};
        for (const part of parts) {
            const [k, ...rest] = part.split('=');
            if (!k || rest.length === 0) continue;
            map[k.toLowerCase()] = rest.join('=');
        }
        return {
            endpoint: map['accountendpoint'],
            key: map['accountkey']
        };
    }

    public getEventsContainer(): Container {
        return this.eventsContainer;
    }

    private getEventsPartitionKeyValue(from: any): any {
        const path = (this.eventsPartitionKeyPath || '/id').startsWith('/')
            ? (this.eventsPartitionKeyPath as string).slice(1)
            : this.eventsPartitionKeyPath;
        return from && from[path] !== undefined ? from[path] : from?.id;
    }

    private async initialize(): Promise<void> {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = (async () => {
            try {
                // Try to ensure database exists (will no-op if it already exists)
                const dbResponse = await this.client.databases.createIfNotExists({ id: this.database.id });
                this.database = dbResponse.database;

                // Ensure containers exist; Events uses configurable PK path (default /id)
                const { container: eventsContainer } = await this.database.containers.createIfNotExists({ id: 'Events', partitionKey: { paths: [this.eventsPartitionKeyPath] } });
                this.eventsContainer = eventsContainer;
                const ensure = async (id: string) => {
                    const { container } = await this.database.containers.createIfNotExists({ id, partitionKey: { paths: ['/id'] } });
                    return container;
                };
                this.usersContainer = await ensure('Users');
                this.registrationsContainer = await ensure('Registrations');
                this.chatContainer = await ensure('ChatMessages');
                this.photosContainer = await ensure('Photos');
            } catch (err) {
                // If creation is not permitted (e.g., provisioned throughput requirements), assume resources already exist
                // and proceed with the pre-assigned container references.
                // Log for diagnosis in dev
                // eslint-disable-next-line no-console
                console.error('Cosmos initialize() warning:', err);
            }
        })();
        return this.initializationPromise;
    }

    // Events
    async getEvents(): Promise<Event[]> {
        await this.initialize();
        const { resources } = await this.eventsContainer.items
            .query<Event>({
                query: 'SELECT * FROM c ORDER BY c.createdAt DESC'
            })
            .fetchAll();
        return resources;
    }

    async getEventById(id: string): Promise<Event | null> {
        await this.initialize();
        const { resources } = await this.eventsContainer.items
            .query<Event>({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: id }]
            })
            .fetchAll();
        return resources[0] || null;
    }

    async createEvent(event: Event): Promise<Event> {
        await this.initialize();
        // Ensure partition key field exists if PK path is not /id
        const pkField = (this.eventsPartitionKeyPath || '/id').replace(/^\//, '');
        const doc: any = { ...event };
        if (pkField && pkField !== 'id' && doc[pkField] === undefined) {
            doc[pkField] = event.id;
        }
        const { resource } = await this.eventsContainer.items.create(doc);
        return resource as Event;
    }

    async updateEvent(id: string, event: Partial<Event>): Promise<Event> {
        await this.initialize();
        const existing = await this.getEventById(id);
        const merged: Event = { ...(existing as Event), ...event, id, updatedAt: new Date().toISOString() };
        // Ensure PK field remains consistent
        const pkField = (this.eventsPartitionKeyPath || '/id').replace(/^\//, '');
        if (pkField && pkField !== 'id' && (merged as any)[pkField] === undefined) {
            (merged as any)[pkField] = merged.id;
        }
        const { resource } = await this.eventsContainer.items.upsert(merged);
        return resource as unknown as Event;
    }

    async deleteEvent(id: string): Promise<void> {
        await this.initialize();
        const existing = await this.getEventById(id);
        if (!existing) return;
        const pkValue = this.getEventsPartitionKeyValue(existing);
        await this.eventsContainer.item(id, pkValue).delete();
    }

    async getEventsByCreator(creatorId: string): Promise<Event[]> {
        await this.initialize();
        const { resources } = await this.eventsContainer.items
            .query<Event>({
                query: 'SELECT * FROM c WHERE c.creatorId = @creatorId ORDER BY c.date DESC',
                parameters: [{ name: '@creatorId', value: creatorId }]
            })
            .fetchAll();
        return resources;
    }

    // Users
    async getUserById(id: string): Promise<User | null> {
        try {
            await this.initialize();
            const { resource } = await this.usersContainer.item(id, id).read<User>();
            return resource ?? null;
        } catch (error) {
            return null;
        }
    }

    async getUserByEmail(email: string): Promise<User | null> {
        await this.initialize();
        const { resources } = await this.usersContainer.items
            .query<User>({
                query: 'SELECT * FROM c WHERE c.email = @email',
                parameters: [{ name: '@email', value: email }]
            })
            .fetchAll();
        return resources[0] || null;
    }

    async createUser(user: User): Promise<User> {
        await this.initialize();
        const { resource } = await this.usersContainer.items.create(user);
        return resource!;
    }

    async updateUser(id: string, user: Partial<User>): Promise<User> {
        await this.initialize();
        const { resource: existing } = await this.usersContainer.item(id, id).read<User>();
        const merged: User = { ...(existing as User), ...user, id, updatedAt: new Date().toISOString() };
        const { resource } = await this.usersContainer.item(id, id).replace(merged);
        return resource as User;
    }

    // Event Registrations
    async registerForEvent(registration: EventRegistration): Promise<EventRegistration> {
        await this.initialize();
        const { resource } = await this.registrationsContainer.items.create(registration);
        return resource!;
    }

    async getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
        await this.initialize();
        const { resources } = await this.registrationsContainer.items
            .query<EventRegistration>({
                query: 'SELECT * FROM c WHERE c.eventId = @eventId ORDER BY c.registeredAt ASC',
                parameters: [{ name: '@eventId', value: eventId }]
            })
            .fetchAll();
        return resources;
    }

    async getUserRegistrations(userId: string): Promise<EventRegistration[]> {
        await this.initialize();
        const { resources } = await this.registrationsContainer.items
            .query<EventRegistration>({
                query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.registeredAt DESC',
                parameters: [{ name: '@userId', value: userId }]
            })
            .fetchAll();
        return resources;
    }

    async isUserRegistered(eventId: string, userId: string): Promise<boolean> {
        await this.initialize();
        const { resources } = await this.registrationsContainer.items
            .query<EventRegistration>({
                query: 'SELECT * FROM c WHERE c.eventId = @eventId AND c.userId = @userId',
                parameters: [
                    { name: '@eventId', value: eventId },
                    { name: '@userId', value: userId }
                ]
            })
            .fetchAll();
        return resources.length > 0;
    }

    // Chat Messages
    async getChatMessages(eventId: string): Promise<ChatMessage[]> {
        await this.initialize();
        const { resources } = await this.chatContainer.items
            .query<ChatMessage>({
                query: 'SELECT * FROM c WHERE c.eventId = @eventId ORDER BY c.timestamp ASC',
                parameters: [{ name: '@eventId', value: eventId }]
            })
            .fetchAll();
        return resources;
    }

    async addChatMessage(message: ChatMessage): Promise<ChatMessage> {
        await this.initialize();
        const { resource } = await this.chatContainer.items.create(message);
        return resource!;
    }

    // Photos
    async getEventPhotos(eventId: string): Promise<Photo[]> {
        await this.initialize();
        const { resources } = await this.photosContainer.items
            .query<Photo>({
                query: 'SELECT * FROM c WHERE c.eventId = @eventId ORDER BY c.uploadedAt DESC',
                parameters: [{ name: '@eventId', value: eventId }]
            })
            .fetchAll();
        return resources;
    }

    async addPhoto(photo: Photo): Promise<Photo> {
        await this.initialize();
        const { resource } = await this.photosContainer.items.create(photo);
        return resource!;
    }

    async deletePhoto(photoId: string): Promise<void> {
        await this.initialize();
        await this.photosContainer.item(photoId, photoId).delete();
    }
}
