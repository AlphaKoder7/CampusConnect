import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';

app.http('getEventById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}',
    handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const eventId = request.params.id;
            if (!eventId) {
                return { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                    body: JSON.stringify({ error: 'Event ID is required' }) 
                };
            }

            const cosmosService = CosmosService.getInstance();
            const event = await cosmosService.getEventById(eventId);
            
            if (!event) {
                return { 
                    status: 404, 
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                    body: JSON.stringify({ error: 'Event not found' }) 
                };
            }
            
            return { 
                status: 200, 
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                body: JSON.stringify(event) 
            };
        } catch (error) {
            console.error('getEventById function error:', error);
            return { 
                status: 500, 
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                body: JSON.stringify({ 
                    error: 'Failed to fetch event',
                    details: error instanceof Error ? error.message : 'Unknown error'
                }) 
            };
        }
    }
});


