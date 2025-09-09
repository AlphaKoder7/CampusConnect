import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';
import { parseSwaClientPrincipal } from '../shared/utils/auth';

const cosmosService = new CosmosService();

app.http('unregisterFromEvent', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'events/{id}/register',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const principal = parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'));
            if (!principal) return { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Unauthorized' }) };
            const eventId = request.params.id;
            const event = await cosmosService.getEventById(eventId);
            if (!event) return { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Event not found' }) };
            const isRegistered = await cosmosService.isUserRegistered(eventId, principal.userId);
            if (!isRegistered) return { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Not registered' }) };
            await cosmosService.deleteRegistration(eventId, principal.userId);
            await cosmosService.updateEvent(eventId, { attendees: event.attendees.filter(a => a !== principal.userId) });
            return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } };
        } catch (error) {
            context.error('unregister error', error);
            return { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Failed to un-register' }) };
        }
    }
});


