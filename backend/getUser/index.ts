import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { parseSwaClientPrincipal } from '../shared/utils/auth';
import { CosmosService } from '../shared/services/CosmosService';

app.http('getUser', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'getUser',
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

            // Test database connectivity
            try {
                const cosmosService = CosmosService.getInstance();
                await cosmosService.getEvents(); // Simple test to ensure DB is accessible
                console.log('Database connectivity test successful for getUser');
            } catch (dbError) {
                console.error('Database connectivity test failed for getUser:', dbError);
                return {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ 
                        error: 'Database connection failed',
                        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
                    })
                };
            }

            return { 
                status: 200, 
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                body: JSON.stringify(principal) 
            };
        } catch (error) {
            console.error('getUser function error:', error);
            return {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'Internal server error',
                    details: error instanceof Error ? error.message : 'Unknown error'
                })
            };
        }
    }
});


