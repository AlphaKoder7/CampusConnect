import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';
import { parseUserPrincipal } from '../shared/utils/auth';

export async function getRegistrationStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
        },
        body: JSON.stringify({ error: 'Unauthorized - user not authenticated' })
      };
    }

    const eventId = request.params.id;

    if (!eventId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
        },
        body: JSON.stringify({ error: 'Event ID is required' })
      };
    }

    const cosmosService = CosmosService.getInstance();
    await cosmosService.initialize();
    
    // Get the event
    const event = await cosmosService.getEventById(eventId);
    if (!event) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
        },
        body: JSON.stringify({ error: 'Event not found' })
      };
    }

    const isRegistered = event.attendees.includes(principal.userId);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
      },
      body: JSON.stringify({ 
        isRegistered,
        currentAttendees: event.currentAttendees,
        maxAttendees: event.maxAttendees,
        isFull: event.currentAttendees >= event.maxAttendees
      })
    };

  } catch (error) {
    context.error('Error getting registration status:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

app.http('getRegistrationStatus', {
  methods: ['GET'],
  authLevel: 'function',
  handler: getRegistrationStatus
});