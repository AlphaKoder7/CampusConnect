import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';
import { Event } from '../shared/models/Event';
import { parseUserPrincipal } from '../shared/utils/auth';
import { v4 as uuidv4 } from 'uuid';

export async function createEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Parse user principal from Static Web Apps
    const userPrincipalHeader = request.headers.get('x-ms-client-principal');
    const principal = parseUserPrincipal(userPrincipalHeader);

    if (!principal) {
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
        },
        body: JSON.stringify({ error: 'Unauthorized - user not authenticated' })
      };
    }

    // Parse request body
    const eventData = await request.json() as Omit<Event, 'id' | 'creatorId' | 'creatorName' | 'createdAt' | 'updatedAt' | 'attendees' | 'currentAttendees'>;

    // Create new event
    const newEvent: Event = {
      id: uuidv4(),
      ...eventData,
      creatorId: principal.userId,
      creatorName: principal.userDetails,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attendees: [],
      currentAttendees: 0
    };

    // Save to Cosmos DB
    const cosmosService = CosmosService.getInstance();
    await cosmosService.initialize();
    const createdEvent = await cosmosService.createEvent(newEvent);

    return {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
      },
      body: JSON.stringify(createdEvent)
    };

  } catch (error) {
    context.error('Error creating event:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

app.http('createEvent', {
  methods: ['POST'],
  authLevel: 'function',
  handler: createEvent
});
