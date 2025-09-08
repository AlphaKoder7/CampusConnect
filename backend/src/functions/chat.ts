import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../services/CosmosService';
import { ChatMessage, SendMessageRequest } from '../models/Chat';
import { v4 as uuidv4 } from 'uuid';

const cosmosService = new CosmosService();

// GET /api/events/{id}/chat - Get chat messages for an event
app.http('getChatMessages', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'events/{id}/chat',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
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
        
        // TODO: Check if user is registered for the event
        // TODO: Check if event is currently active (within time window)
        
        const messages = await cosmosService.getChatMessages(eventId);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(messages)
        };
    } catch (error) {
        context.error('Error fetching chat messages:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to fetch chat messages' })
        };
    }
    }
});

// POST /api/events/{id}/chat - Send a chat message
app.http('sendChatMessage', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'events/{id}/chat',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const eventId = request.params.id;
        const messageData = await request.json() as unknown as SendMessageRequest;
        
        // Validate required fields
        if (!messageData.message || !messageData.userId || !messageData.userName) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Missing required fields' })
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
        
        // TODO: Check if user is registered for the event
        // TODO: Check if event is currently active (within time window)
        // TODO: Validate message content (length, content filtering)
        
        const chatMessage: ChatMessage = {
            id: uuidv4(),
            eventId,
            userId: messageData.userId,
            userName: messageData.userName,
            message: messageData.message.trim(),
            timestamp: new Date().toISOString(),
            type: 'text'
        };
        
        const createdMessage = await cosmosService.addChatMessage(chatMessage);
        
        // TODO: Broadcast message via Azure Web PubSub
        
        return {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(createdMessage)
        };
    } catch (error) {
        context.error('Error sending chat message:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to send message' })
        };
    }
    }
});

// GET /api/events/{id}/chat/status - Get chat room status
app.http('getChatStatus', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'events/{id}/chat/status',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
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
        
        // Check if event is currently active
        const now = new Date();
        const eventDateTime = new Date(`${event.date}T${event.time}`);
        const eventEndTime = new Date(eventDateTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours after start
        
        const isActive = now >= eventDateTime && now <= eventEndTime;
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                eventId,
                isActive,
                eventStartTime: eventDateTime.toISOString(),
                eventEndTime: eventEndTime.toISOString(),
                currentTime: now.toISOString()
            })
        };
    } catch (error) {
        context.error('Error getting chat status:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to get chat status' })
        };
    }
    }
});
