import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

interface SwaClientPrincipal {
    identityProvider: string;
    userId: string;
    userDetails: string;
    userRoles: string[];
}

function parseSwaClientPrincipal(headerValue?: string | null): SwaClientPrincipal | null {
    if (!headerValue) return null;
    try {
        const decoded = Buffer.from(headerValue, 'base64').toString('utf8');
        const obj = JSON.parse(decoded);
        return {
            identityProvider: obj.identityProvider,
            userId: obj.userId,
            userDetails: obj.userDetails,
            userRoles: Array.isArray(obj.userRoles) ? obj.userRoles : []
        };
    } catch {
        return null;
    }
}

app.http('getUser', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'getUser',
    handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
        const principal = parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'));
        if (!principal) {
            return {
                status: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }
        return {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(principal)
        };
    }
});


