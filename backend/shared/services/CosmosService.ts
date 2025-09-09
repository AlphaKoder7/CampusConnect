import { CosmosClient, Database, Container } from '@azure/cosmos';
import { Event, EventRegistration } from '../models/Event';

export class CosmosService {
    private client: CosmosClient;
    private database: Database;
    private eventsContainer: Container;
    private usersContainer: Container;
    private registrationsContainer: Container;
    private chatContainer: Container;
    private photosContainer: Container;
    private initializationPromise: Promise<void> | null = null;

    constructor() {
        const databaseId = process.env.COSMOS_DB_DATABASE || 'CampusConnectDB';
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
        this.eventsContainer = this.database.container('Events');
        this.usersContainer = this.database.container('Users');
        this.registrationsContainer = this.database.container('Registrations');
        this.chatContainer = this.database.container('ChatMessages');
        this.photosContainer = this.database.container('Photos');
    }

    private parseConnectionString(connectionString: string): { endpoint?: string; key?: string } {
        const parts = connectionString.split(';').map(p => p.trim()).filter(Boolean);
        const map: Record<string, string> = {};
        for (const part of parts) {
            const [k, ...rest] = part.split('=');
            if (!k || rest.length === 0) continue;
            map[k.toLowerCase()] = rest.join('=');
        }
        return { endpoint: map['accountendpoint'], key: map['accountkey'] };
    }

    private async initialize(): Promise<void> {
        if (this.initializationPromise) return this.initializationPromise;
        this.initializationPromise = (async () => {
            try {
                const dbResponse = await this.client.databases.createIfNotExists({ id: this.database.id });
                this.database = dbResponse.database;
                const ensure = async (id: string) => {
                    const { container } = await this.database.containers.createIfNotExists({ id, partitionKey: { paths: ['/id'] } });
                    return container;
                };
                this.eventsContainer = await ensure('Events');
                this.usersContainer = await ensure('Users');
                this.registrationsContainer = await ensure('Registrations');
                this.chatContainer = await ensure('ChatMessages');
                this.photosContainer = await ensure('Photos');
            } catch (err) {
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
            .query<Event>({ query: 'SELECT * FROM c ORDER BY c.createdAt DESC' })
            .fetchAll();
        return resources;
    }

    async getEventById(id: string): Promise<Event | null> {
        await this.initialize();
        const { resources } = await this.eventsContainer.items
            .query<Event>({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
            .fetchAll();
        return resources[0] || null;
    }

    async createEvent(event: Event): Promise<Event> {
        await this.initialize();
        const { resource } = await this.eventsContainer.items.create(event as any);
        return resource as Event;
    }

    async updateEvent(id: string, event: Partial<Event>): Promise<Event> {
        await this.initialize();
        const existing = await this.getEventById(id);
        const merged: Event = { ...(existing as Event), ...event, id, updatedAt: new Date().toISOString() };
        const { resource } = await this.eventsContainer.items.upsert(merged as any);
        return resource as Event;
    }

    async deleteEvent(id: string): Promise<void> {
        await this.initialize();
        const existing = await this.getEventById(id);
        if (!existing) return;
        await this.eventsContainer.item(id, id).delete();
    }

    // Registrations
    async registerForEvent(registration: EventRegistration): Promise<EventRegistration> {
        await this.initialize();
        const { resource } = await this.registrationsContainer.items.create(registration as any);
        return resource as EventRegistration;
    }

    async getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
        await this.initialize();
        const { resources } = await this.registrationsContainer.items
            .query<EventRegistration>({ query: 'SELECT * FROM c WHERE c.eventId = @eventId ORDER BY c.registeredAt ASC', parameters: [{ name: '@eventId', value: eventId }] })
            .fetchAll();
        return resources;
    }

    async getUserRegistrations(userId: string): Promise<EventRegistration[]> {
        await this.initialize();
        const { resources } = await this.registrationsContainer.items
            .query<EventRegistration>({ query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.registeredAt DESC', parameters: [{ name: '@userId', value: userId }] })
            .fetchAll();
        return resources;
    }

    async isUserRegistered(eventId: string, userId: string): Promise<boolean> {
        await this.initialize();
        const { resources } = await this.registrationsContainer.items
            .query<EventRegistration>({
                query: 'SELECT * FROM c WHERE c.eventId = @eventId AND c.userId = @userId',
                parameters: [ { name: '@eventId', value: eventId }, { name: '@userId', value: userId } ]
            }).fetchAll();
        return resources.length > 0;
    }

    async deleteRegistration(eventId: string, userId: string): Promise<void> {
        await this.initialize();
        const { resources } = await this.registrationsContainer.items
            .query<EventRegistration>({
                query: 'SELECT * FROM c WHERE c.eventId = @eventId AND c.userId = @userId',
                parameters: [ { name: '@eventId', value: eventId }, { name: '@userId', value: userId } ]
            }).fetchAll();
        for (const reg of resources) {
            await this.registrationsContainer.item(reg.id, reg.id).delete();
        }
    }

    async getAttendees(eventId: string): Promise<EventRegistration[]> {
        await this.initialize();
        const { resources } = await this.registrationsContainer.items
            .query<EventRegistration>({ query: 'SELECT * FROM c WHERE c.eventId = @eventId ORDER BY c.registeredAt ASC', parameters: [{ name: '@eventId', value: eventId }] })
            .fetchAll();
        return resources;
    }
}


