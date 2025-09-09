import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../services/CosmosService';
import { EventRegistration } from '../models/Event';
import { v4 as uuidv4 } from 'uuid';

const cosmosService = new CosmosService();

interface SwaClientPrincipal { identityProvider: string; userId: string; userDetails: string; userRoles: string[]; }
function parseSwaClientPrincipal(headerValue?: string | null): SwaClientPrincipal | null {
    if (!headerValue) return null;
    try { const decoded = Buffer.from(headerValue, 'base64').toString('utf8'); const obj = JSON.parse(decoded); return { identityProvider: obj.identityProvider, userId: obj.userId, userDetails: obj.userDetails, userRoles: Array.isArray(obj.userRoles) ? obj.userRoles : [] }; } catch { return null; }
}

// POST /api/events/{id}/register - Register for an event (SWA auth)
app.http('registerForEvent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'events/{id}/register',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const principal = parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'));
        if (!principal) { return { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Unauthorized' }) }; }
        const eventId = request.params.id;
        
        // Check if event exists
        const event = await cosmosService.getEventById(eventId);
        if (!event) {
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Event not found' })
            };
        }
        
        // Check if user is already registered
        const isRegistered = await cosmosService.isUserRegistered(eventId, principal.userId);
        if (isRegistered) {
            return {
                status: 409,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'User already registered for this event' })
            };
        }
        
        // Check capacity if specified
        if (event.capacity) {
            const registrations = await cosmosService.getEventRegistrations(eventId);
            if (registrations.length >= event.capacity) {
                return {
                    status: 409,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'Event is at capacity' })
                };
            }
        }
        
        // Create registration
        const registration: EventRegistration = {
            id: uuidv4(),
            eventId,
            userId: principal.userId,
            userEmail: '',
            userName: principal.userDetails,
            registrationData: {},
            registeredAt: new Date().toISOString()
        };
        
        const createdRegistration = await cosmosService.registerForEvent(registration);
        
        // Update event attendees list
        await cosmosService.updateEvent(eventId, { attendees: [...event.attendees, principal.userId] });
        
        return {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(createdRegistration)
        };
    } catch (error) {
        context.error('Error registering for event:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to register for event' })
        };
    }
    }
});

// GET /api/events/{id}/registrations - Get event registrations
// GET /api/events/{id}/registration - added below

// GET /api/users/{id}/registrations - Get user's event registrations
app.http('getUserRegistrations', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'users/{id}/registrations',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const userId = request.params.id;
        
        // TODO: Check if user has permission to view these registrations
        
        const registrations = await cosmosService.getUserRegistrations(userId);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(registrations)
        };
    } catch (error) {
        context.error('Error fetching user registrations:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to fetch user registrations' })
        };
    }
    }
});

// DELETE /api/events/{id}/register - Unregister from an event
app.http('unregisterFromEvent', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'events/{id}/register',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const eventId = request.params.id;
        const { userId } = await request.json() as unknown as { userId: string };
        
        if (!userId) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'User ID is required' })
            };
        }
        
        // Check if event exists
        const event = await cosmosService.getEventById(eventId);
        if (!event) {
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Event not found' })
            };
        }
        
        // Check if user is registered
        const isRegistered = await cosmosService.isUserRegistered(eventId, userId);
        if (!isRegistered) {
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'User is not registered for this event' })
            };
        }
        
        // TODO: Remove registration from database
        // TODO: Update event attendees list
        
        return {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        };
    } catch (error) {
        context.error('Error unregistering from event:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to unregister from event' })
        };
    }
    }
});
