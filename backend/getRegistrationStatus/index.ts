import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';
import { parseSwaClientPrincipal } from '../shared/utils/auth';

const cosmosService = new CosmosService();

app.http('getRegistrationStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}/registration',
    handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
        const principal = parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'));
        if (!principal) return { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Unauthorized' }) };
        const eventId = request.params.id;
        const isRegistered = await cosmosService.isUserRegistered(eventId, principal.userId);
        return { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ isRegistered }) };
    }
});


