import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';
import { parseSwaClientPrincipal } from '../shared/utils/auth';

const cosmosService = new CosmosService();

app.http('getEventAttendees', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}/attendees',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const principal = parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'));
            if (!principal) return { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Unauthorized' }) };
            const eventId = request.params.id;
            const event = await cosmosService.getEventById(eventId);
            if (!event) return { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Event not found' }) };
            if (event.creatorId !== principal.userId) return { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Forbidden' }) };
            const attendees = await cosmosService.getAttendees(eventId);
            return { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(attendees) };
        } catch (error) {
            context.error('attendees error', error);
            return { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Failed to get attendees' }) };
        }
    }
});


