import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';
import { parseSwaClientPrincipal } from '../shared/utils/auth';

app.http('getRegistrationStatus', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'events/{id}/registration',
    handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
        try {
            const principal = parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'));
            if (!principal) {
                return { 
                    status: 401, 
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                    body: JSON.stringify({ error: 'Unauthorized' }) 
                };
            }

            const eventId = request.params.id;
            if (!eventId) {
                return { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                    body: JSON.stringify({ error: 'Event ID is required' }) 
                };
            }

            const cosmosService = CosmosService.getInstance();
            const isRegistered = await cosmosService.isUserRegistered(eventId, principal.userId);
            
            return { 
                status: 200, 
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                body: JSON.stringify({ isRegistered }) 
            };
        } catch (error) {
            console.error('getRegistrationStatus function error:', error);
            return { 
                status: 500, 
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                body: JSON.stringify({ 
                    error: 'Failed to get registration status',
                    details: error instanceof Error ? error.message : 'Unknown error'
                }) 
            };
        }
    }
});


