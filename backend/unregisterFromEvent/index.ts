import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';
import { parseUserPrincipal } from '../shared/utils/auth';

export async function unregisterFromEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
        },
        body: JSON.stringify({ error: 'Event not found' })
      };
    }

    // Check if user is registered
    if (!event.attendees.includes(principal.userId)) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
        },
        body: JSON.stringify({ error: 'User is not registered for this event' })
      };
    }

    // Unregister user
    const updatedAttendees = event.attendees.filter(id => id !== principal.userId);
    const updatedEvent = await cosmosService.updateEvent(eventId, {
      attendees: updatedAttendees,
      currentAttendees: event.currentAttendees - 1
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
      },
      body: JSON.stringify({ message: 'Successfully unregistered from event', event: updatedEvent })
    };

  } catch (error) {
    context.error('Error unregistering from event:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

app.http('unregisterFromEvent', {
  methods: ['DELETE'],
  authLevel: 'function',
  handler: unregisterFromEvent
});
