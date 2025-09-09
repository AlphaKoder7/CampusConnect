import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { parseSwaClientPrincipal } from '../shared/utils/auth';
import { CosmosService } from '../shared/services/CosmosService';
import { Event } from '../shared/models/Event';
import { v4 as uuidv4 } from 'uuid';

app.http('createEvent', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'events',
    handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
        try {
            // Check authentication
            const principal = parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'));
            if (!principal) {
                return {
                    status: 401,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ error: 'Unauthorized' })
                };
            }

            // Parse request body
            const eventData = await request.json() as Partial<Event>;
            
            // Validate required fields
            if (!eventData.title || !eventData.description || !eventData.date || !eventData.time || !eventData.location) {
                return {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ error: 'Missing required fields: title, description, date, time, location' })
                };
            }

            // Create event object
            const newEvent: Event = {
                id: uuidv4(),
                title: eventData.title,
                description: eventData.description,
                date: eventData.date,
                time: eventData.time,
                location: eventData.location,
                type: eventData.type || 'other',
                isPrivate: eventData.isPrivate || false,
                capacity: eventData.capacity || 50,
                creatorId: principal.userId,
                creatorName: principal.userDetails || 'Unknown User',
                isOfficial: false,
                attendees: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Save to database
            const cosmosService = CosmosService.getInstance();
            const createdEvent = await cosmosService.createEvent(newEvent);

            return {
                status: 201,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify(createdEvent)
            };
        } catch (error) {
            console.error('createEvent function error:', error);
            return {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'Failed to create event',
                    details: error instanceof Error ? error.message : 'Unknown error'
                })
            };
        }
    }
});


