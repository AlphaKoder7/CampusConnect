import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { parseSwaClientPrincipal } from '../shared/utils/auth';

app.http('getUser', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'getUser',
    handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
        const principal = parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'));
        if (!principal) {
            return { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Unauthorized' }) };
        }
        return { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(principal) };
    }
});


