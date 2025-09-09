import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { parseUserPrincipal } from '../shared/utils/auth';
import { CosmosService } from '../shared/services/CosmosService';

export async function getUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Parse user principal from Static Web Apps
    const userPrincipalHeader = request.headers.get('x-ms-client-principal');
    const principal = parseUserPrincipal(userPrincipalHeader);

    if (!principal) {
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
        },
        body: JSON.stringify({ error: 'Unauthorized - user not authenticated' })
      };
    }

    // Test database connectivity
    try {
      const cosmosService = CosmosService.getInstance();
      await cosmosService.initialize();
    } catch (dbError) {
      context.warn('Database connectivity test failed:', dbError);
    }

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
      },
      body: JSON.stringify({
        userId: principal.userId,
        userDetails: principal.userDetails,
        identityProvider: principal.identityProvider,
        userRoles: principal.userRoles
      })
    };

  } catch (error) {
    context.error('Error getting user:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-ms-client-principal'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

app.http('getUser', {
  methods: ['GET'],
  authLevel: 'function',
  handler: getUser
});
