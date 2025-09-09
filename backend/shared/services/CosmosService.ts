import { CosmosClient, Database, Container } from '@azure/cosmos';
import { Event, EventRegistration } from '../models/Event';

export class CosmosService {
    private static instance: CosmosService | null = null;
    private client: CosmosClient | null = null;
    private database: Database | null = null;
    private eventsContainer: Container | null = null;
    private usersContainer: Container | null = null;
    private registrationsContainer: Container | null = null;
    private chatContainer: Container | null = null;
    private photosContainer: Container | null = null;
    private initializationPromise: Promise<void> | null = null;
    private isInitialized: boolean = false;
    private initializationError: Error | null = null;

    private constructor() {
        // Private constructor for singleton pattern
    }

    public static getInstance(): CosmosService {
        if (!CosmosService.instance) {
            CosmosService.instance = new CosmosService();
        }
        return CosmosService.instance;
    }

    private async initializeClient(): Promise<void> {
        if (this.client) {
            return; // Already initialized
        }

        try {
            const databaseId = process.env.COSMOS_DB_DATABASE || 'CampusConnectDB';
            const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
            let endpoint = process.env.COSMOS_DB_ENDPOINT;
            let key = process.env.COSMOS_DB_KEY;

            // Parse connection string if provided
            if (connectionString && (!endpoint || !key)) {
                const parsed = this.parseConnectionString(connectionString);
                endpoint = parsed.endpoint || endpoint;
                key = parsed.key || key;
            }

            // Validate configuration
            if (!endpoint || !key) {
                const error = new Error('Cosmos DB configuration is missing. Provide COSMOS_DB_CONNECTION_STRING or COSMOS_DB_ENDPOINT and COSMOS_DB_KEY.');
                console.error('CosmosService initialization failed:', error.message);
                throw error;
            }

            // Initialize client
            this.client = new CosmosClient({ endpoint, key });
            this.database = this.client.database(databaseId);
            
            // Initialize container references
            this.eventsContainer = this.database.container('Events');
            this.usersContainer = this.database.container('Users');
            this.registrationsContainer = this.database.container('Registrations');
            this.chatContainer = this.database.container('ChatMessages');
            this.photosContainer = this.database.container('Photos');

            console.log('CosmosService client initialized successfully');
        } catch (error) {
            const errorMessage = `Failed to initialize CosmosService client: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            this.initializationError = error instanceof Error ? error : new Error(errorMessage);
            throw this.initializationError;
        }
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
        if (this.isInitialized) {
            return;
        }

        if (this.initializationError) {
            throw this.initializationError;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            try {
                // Initialize client first
                await this.initializeClient();

                if (!this.client || !this.database) {
                    throw new Error('Client or database not initialized');
                }

                // Create database if it doesn't exist
                console.log('Creating database if not exists...');
                const dbResponse = await this.client.databases.createIfNotExists({ 
                    id: this.database.id 
                });
                this.database = dbResponse.database;
                console.log('Database ready:', this.database.id);

                // Helper function to create containers
                const ensureContainer = async (id: string): Promise<Container> => {
                    try {
                        console.log(`Creating container '${id}' if not exists...`);
                        const { container } = await this.database!.containers.createIfNotExists({ 
                            id, 
                            partitionKey: { paths: ['/id'] } 
                        });
                        console.log(`Container '${id}' ready`);
                        return container;
                    } catch (error) {
                        const errorMessage = `Failed to create container '${id}': ${error instanceof Error ? error.message : 'Unknown error'}`;
                        console.error(errorMessage, error);
                        throw new Error(errorMessage);
                    }
                };

                // Create all containers
                this.eventsContainer = await ensureContainer('Events');
                this.usersContainer = await ensureContainer('Users');
                this.registrationsContainer = await ensureContainer('Registrations');
                this.chatContainer = await ensureContainer('ChatMessages');
                this.photosContainer = await ensureContainer('Photos');

                this.isInitialized = true;
                console.log('CosmosService initialization completed successfully');
            } catch (error) {
                const errorMessage = `CosmosService initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                console.error(errorMessage, error);
                this.initializationError = error instanceof Error ? error : new Error(errorMessage);
                throw this.initializationError;
            }
        })();

        return this.initializationPromise;
    }

    // Events
    async getEvents(): Promise<Event[]> {
        try {
            await this.initialize();
            if (!this.eventsContainer) {
                throw new Error('Events container not initialized');
            }
            const { resources } = await this.eventsContainer.items
                .query<Event>({ query: 'SELECT * FROM c ORDER BY c.createdAt DESC' })
                .fetchAll();
            return resources;
        } catch (error) {
            const errorMessage = `Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    async getEventById(id: string): Promise<Event | null> {
        try {
            await this.initialize();
            if (!this.eventsContainer) {
                throw new Error('Events container not initialized');
            }
            const { resources } = await this.eventsContainer.items
                .query<Event>({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
                .fetchAll();
            return resources[0] || null;
        } catch (error) {
            const errorMessage = `Failed to get event by ID '${id}': ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    async createEvent(event: Event): Promise<Event> {
        try {
            await this.initialize();
            if (!this.eventsContainer) {
                throw new Error('Events container not initialized');
            }
            const { resource } = await this.eventsContainer.items.create(event as any);
            return resource as Event;
        } catch (error) {
            const errorMessage = `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    async updateEvent(id: string, event: Partial<Event>): Promise<Event> {
        try {
            await this.initialize();
            if (!this.eventsContainer) {
                throw new Error('Events container not initialized');
            }
            const existing = await this.getEventById(id);
            if (!existing) {
                throw new Error(`Event with ID '${id}' not found`);
            }
            const merged: Event = { ...existing, ...event, id, updatedAt: new Date().toISOString() };
            const { resource } = await this.eventsContainer.items.upsert(merged as any);
            return resource as unknown as Event;
        } catch (error) {
            const errorMessage = `Failed to update event '${id}': ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    async deleteEvent(id: string): Promise<void> {
        try {
            await this.initialize();
            if (!this.eventsContainer) {
                throw new Error('Events container not initialized');
            }
            const existing = await this.getEventById(id);
            if (!existing) {
                console.warn(`Event with ID '${id}' not found for deletion`);
                return;
            }
            await this.eventsContainer.item(id, id).delete();
        } catch (error) {
            const errorMessage = `Failed to delete event '${id}': ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    // Registrations
    async registerForEvent(registration: EventRegistration): Promise<EventRegistration> {
        try {
            await this.initialize();
            if (!this.registrationsContainer) {
                throw new Error('Registrations container not initialized');
            }
            const { resource } = await this.registrationsContainer.items.create(registration as any);
            return resource as EventRegistration;
        } catch (error) {
            const errorMessage = `Failed to register for event: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    async getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
        try {
            await this.initialize();
            if (!this.registrationsContainer) {
                throw new Error('Registrations container not initialized');
            }
            const { resources } = await this.registrationsContainer.items
                .query<EventRegistration>({ query: 'SELECT * FROM c WHERE c.eventId = @eventId ORDER BY c.registeredAt ASC', parameters: [{ name: '@eventId', value: eventId }] })
                .fetchAll();
            return resources;
        } catch (error) {
            const errorMessage = `Failed to get event registrations for event '${eventId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    async getUserRegistrations(userId: string): Promise<EventRegistration[]> {
        try {
            await this.initialize();
            if (!this.registrationsContainer) {
                throw new Error('Registrations container not initialized');
            }
            const { resources } = await this.registrationsContainer.items
                .query<EventRegistration>({ query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.registeredAt DESC', parameters: [{ name: '@userId', value: userId }] })
                .fetchAll();
            return resources;
        } catch (error) {
            const errorMessage = `Failed to get user registrations for user '${userId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    async isUserRegistered(eventId: string, userId: string): Promise<boolean> {
        try {
            await this.initialize();
            if (!this.registrationsContainer) {
                throw new Error('Registrations container not initialized');
            }
            const { resources } = await this.registrationsContainer.items
                .query<EventRegistration>({
                    query: 'SELECT * FROM c WHERE c.eventId = @eventId AND c.userId = @userId',
                    parameters: [ { name: '@eventId', value: eventId }, { name: '@userId', value: userId } ]
                }).fetchAll();
            return resources.length > 0;
        } catch (error) {
            const errorMessage = `Failed to check registration status for user '${userId}' and event '${eventId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    async deleteRegistration(eventId: string, userId: string): Promise<void> {
        try {
            await this.initialize();
            if (!this.registrationsContainer) {
                throw new Error('Registrations container not initialized');
            }
            const { resources } = await this.registrationsContainer.items
                .query<EventRegistration>({
                    query: 'SELECT * FROM c WHERE c.eventId = @eventId AND c.userId = @userId',
                    parameters: [ { name: '@eventId', value: eventId }, { name: '@userId', value: userId } ]
                }).fetchAll();
            
            if (resources.length === 0) {
                console.warn(`No registration found for user '${userId}' and event '${eventId}'`);
                return;
            }

            for (const reg of resources) {
                await this.registrationsContainer.item(reg.id, reg.id).delete();
            }
        } catch (error) {
            const errorMessage = `Failed to delete registration for user '${userId}' and event '${eventId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    async getAttendees(eventId: string): Promise<EventRegistration[]> {
        try {
            await this.initialize();
            if (!this.registrationsContainer) {
                throw new Error('Registrations container not initialized');
            }
            const { resources } = await this.registrationsContainer.items
                .query<EventRegistration>({ query: 'SELECT * FROM c WHERE c.eventId = @eventId ORDER BY c.registeredAt ASC', parameters: [{ name: '@eventId', value: eventId }] })
                .fetchAll();
            return resources;
        } catch (error) {
            const errorMessage = `Failed to get attendees for event '${eventId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }
}


