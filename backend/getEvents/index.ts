import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';

const cosmosService = new CosmosService();

app.http('getEvents', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events',
    handler: async (_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const events = await cosmosService.getEvents();
            return { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(events) };
        } catch (error) {
            return { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Failed to fetch events' }) };
        }
    }
});


