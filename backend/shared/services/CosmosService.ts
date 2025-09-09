import { CosmosClient, Database, Container } from '@azure/cosmos';
import { Event } from '../models/Event';

export class CosmosService {
  private static instance: CosmosService;
  private client: CosmosClient | null = null;
  private database: Database | null = null;
  private eventsContainer: Container | null = null;

  private constructor() {}

  public static getInstance(): CosmosService {
    if (!CosmosService.instance) {
      CosmosService.instance = new CosmosService();
    }
    return CosmosService.instance;
  }

  private initializeClient(): void {
    const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
    
    if (!connectionString) {
      throw new Error('COSMOS_DB_CONNECTION_STRING environment variable is not set');
    }

    try {
      this.client = new CosmosClient(connectionString);
      console.log('Cosmos DB client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Cosmos DB client:', error);
      throw error;
    }
  }

  public async initialize(): Promise<void> {
    try {
      this.initializeClient();
      
      if (!this.client) {
        throw new Error('Cosmos client not initialized');
      }

      // Initialize database
      const { database } = await this.client.databases.createIfNotExists({
        id: 'CampusConnectDB'
      });
      this.database = database;
      console.log('Database initialized:', database.id);

      // Initialize events container
      const { container } = await this.database.containers.createIfNotExists({
        id: 'Events',
        partitionKey: '/id'
      });
      this.eventsContainer = container;
      console.log('Events container initialized:', container.id);

    } catch (error) {
      console.error('Failed to initialize Cosmos DB:', error);
      throw error;
    }
  }

  public async createEvent(event: Event): Promise<Event> {
    try {
      if (!this.eventsContainer) {
        await this.initialize();
      }

      if (!this.eventsContainer) {
        throw new Error('Events container not available');
      }

      const { resource } = await this.eventsContainer.items.create(event);
      console.log('Event created successfully:', resource?.id);
      return resource as unknown as Event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  public async getEvents(): Promise<Event[]> {
    try {
      if (!this.eventsContainer) {
        await this.initialize();
      }

      if (!this.eventsContainer) {
        throw new Error('Events container not available');
      }

      const { resources } = await this.eventsContainer.items
        .query<Event>({
          query: 'SELECT * FROM c ORDER BY c.createdAt DESC'
        })
        .fetchAll();

      console.log(`Retrieved ${resources.length} events`);
      return resources;
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  }

  public async getEventById(id: string): Promise<Event | null> {
    try {
      if (!this.eventsContainer) {
        await this.initialize();
      }

      if (!this.eventsContainer) {
        throw new Error('Events container not available');
      }

      const { resource } = await this.eventsContainer.item(id, id).read<Event>();
      
      if (!resource) {
        console.log(`Event with id ${id} not found`);
        return null;
      }

      console.log(`Retrieved event: ${resource.id}`);
      return resource as unknown as Event;
    } catch (error) {
      console.error('Error getting event by id:', error);
      throw error;
    }
  }

  public async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    try {
      if (!this.eventsContainer) {
        await this.initialize();
      }

      if (!this.eventsContainer) {
        throw new Error('Events container not available');
      }

      const { resource } = await this.eventsContainer.item(id, id).replace({
        ...updates,
        id,
        updatedAt: new Date().toISOString()
      });

      console.log('Event updated successfully:', resource?.id);
      return resource as unknown as Event;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }
}
