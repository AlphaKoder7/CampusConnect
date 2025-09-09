import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../shared/services/CosmosService';
import { EventRegistration } from '../shared/models/Event';
import { parseSwaClientPrincipal } from '../shared/utils/auth';
import { v4 as uuidv4 } from 'uuid';

const cosmosService = new CosmosService();

app.http('registerForEvent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'events/{id}/register',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const principal = parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'));
            if (!principal) return { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Unauthorized' }) };
            const eventId = request.params.id;
            const event = await cosmosService.getEventById(eventId);
            if (!event) return { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Event not found' }) };
            if (await cosmosService.isUserRegistered(eventId, principal.userId)) return { status: 409, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Already registered' }) };
            if (event.capacity) {
                const regs = await cosmosService.getEventRegistrations(eventId);
                if (regs.length >= event.capacity) return { status: 409, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Event at capacity' }) };
            }
            const registration: EventRegistration = { id: uuidv4(), eventId, userId: principal.userId, userEmail: '', userName: principal.userDetails, registrationData: {}, registeredAt: new Date().toISOString() };
            const created = await cosmosService.registerForEvent(registration);
            await cosmosService.updateEvent(eventId, { attendees: [...event.attendees, principal.userId] });
            return { status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(created) };
        } catch (error) {
            context.error('register error', error);
            return { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Failed to register' }) };
        }
    }
});


