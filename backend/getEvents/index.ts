import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';

export async function getEvents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const cosmosService = CosmosService.getInstance();
    await cosmosService.initialize();
    const events = await cosmosService.getEvents();

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(events)
    };

  } catch (error) {
    context.error('Error getting events:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

app.http('getEvents', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: getEvents
});
