import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';

const cosmosService = new CosmosService();

app.http('getEventById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}',
    handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const eventId = request.params.id;
            const event = await cosmosService.getEventById(eventId);
            if (!event) {
                return { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Event not found' }) };
            }
            return { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(event) };
        } catch (error) {
            return { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Failed to fetch event' }) };
        }
    }
});


