import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../services/CosmosService';
import { Event, CreateEventRequest } from '../models/Event';
import { v4 as uuidv4 } from 'uuid';

const cosmosService = new CosmosService();

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

// GET /api/events - Get all public events
app.http('getEvents', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const events = await cosmosService.getEvents();
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(events)
            };
        } catch (error) {
            context.error('Error fetching events:', error);
            // During dev, return empty list instead of failing the page
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify([])
            };
        }
    }
});

// GET /api/events/{id} - Get specific event
app.http('getEventById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const eventId = request.params.id;
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
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(event)
            };
        } catch (error) {
            context.error('Error fetching event:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Failed to fetch event' })
            };
        }
    }
});

// POST /api/events - Create new event
app.http('createEvent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'events',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Read user from Static Web Apps header
            const principal = parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'));
            if (!principal) {
                return {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'Unauthorized' })
                };
            }

            const eventData = await parseRequestJson<CreateEventRequest>(request);
            if (!eventData.title || !eventData.description || !eventData.date || !eventData.time || !eventData.location) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'Missing required fields' })
                };
            }
            const creatorId = principal.userId;
            const creatorName = principal.userDetails || 'User';
            const event: Event = {
                id: uuidv4(),
                title: eventData.title,
                description: eventData.description,
                date: eventData.date,
                time: eventData.time,
                location: eventData.location,
                type: eventData.type || 'other',
                isPrivate: eventData.isPrivate || false,
                accessCode: eventData.isPrivate ? generateAccessCode() : undefined,
                capacity: eventData.capacity,
                creatorId,
                creatorName,
                isOfficial: false,
                attendees: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                customFields: eventData.customFields || []
            };
            const createdEvent = await cosmosService.createEvent(event);
            return {
                status: 201,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(createdEvent)
            };
        } catch (error) {
            context.error('Error creating event:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Failed to create event', details: (error as Error)?.message })
            };
        }
    }
});

// PUT /api/events/{id} - Update event
app.http('updateEvent', {
    methods: ['PUT'],
    authLevel: 'function',
    route: 'events/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const eventId = request.params.id;
            const updateData = await request.json() as unknown as Partial<Event>;
            const existingEvent = await cosmosService.getEventById(eventId);
            if (!existingEvent) {
                return {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'Event not found' })
                };
            }
            const updatedEvent = await cosmosService.updateEvent(eventId, updateData);
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(updatedEvent)
            };
        } catch (error) {
            context.error('Error updating event:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Failed to update event' })
            };
        }
    }
});

// DELETE /api/events/{id} - Delete event
app.http('deleteEvent', {
    methods: ['DELETE'],
    authLevel: 'function',
    route: 'events/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const eventId = request.params.id;
            const existingEvent = await cosmosService.getEventById(eventId);
            if (!existingEvent) {
                return {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'Event not found' })
                };
            }
            await cosmosService.deleteEvent(eventId);
            return {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            };
        } catch (error) {
            context.error('Error deleting event:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Failed to delete event' })
            };
        }
    }
});

// Helper function to generate access code for private events
function generateAccessCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function parseRequestJson<T>(request: HttpRequest): Promise<T> {
    // Read body once and try multiple parse strategies
    const raw = await request.text();
    if (!raw || raw.trim() === '') {
        throw new Error('Empty request body');
    }
    // Try JSON first
    try {
        return JSON.parse(raw) as T;
    } catch {}
    // Try URL-encoded form body
    try {
        const params = new URLSearchParams(raw);
        const obj: Record<string, unknown> = {};
        params.forEach((v, k) => { obj[k] = v; });
        return obj as unknown as T;
    } catch {}
    throw new Error('Invalid JSON body');
}
