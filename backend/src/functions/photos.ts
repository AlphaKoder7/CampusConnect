import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../services/CosmosService';
import { Photo, UploadPhotoRequest } from '../models/Photo';
import { v4 as uuidv4 } from 'uuid';

const cosmosService = new CosmosService();

// GET /api/events/{id}/photos - Get photos for an event
app.http('getEventPhotos', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}/photos',
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
        
        const photos = await cosmosService.getEventPhotos(eventId);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                eventId,
                photos,
                totalCount: photos.length
            })
        };
    } catch (error) {
        context.error('Error fetching event photos:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to fetch photos' })
        };
    }
    }
});

// POST /api/events/{id}/photos - Upload a photo
app.http('uploadPhoto', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'events/{id}/photos',
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
        // TODO: Check if event has ended (photos can only be uploaded after event)
        
        const uploadData = await request.json() as unknown as UploadPhotoRequest;
        
        // Validate required fields
        if (!uploadData.userId || !uploadData.userName) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Missing required user information' })
            };
        }
        
        // TODO: Handle file upload to Azure Blob Storage
        // For now, we'll create a placeholder photo record
        
        const photo: Photo = {
            id: uuidv4(),
            eventId,
            userId: uploadData.userId,
            userName: uploadData.userName,
            fileName: 'placeholder.jpg', // TODO: Get from uploaded file
            fileUrl: 'https://placeholder.com/400x300', // TODO: Get from blob storage
            caption: uploadData.caption || '',
            uploadedAt: new Date().toISOString(),
            metadata: {
                size: 0, // TODO: Get from uploaded file
                width: 400, // TODO: Get from uploaded file
                height: 300, // TODO: Get from uploaded file
                mimeType: 'image/jpeg' // TODO: Get from uploaded file
            }
        };
        
        const createdPhoto = await cosmosService.addPhoto(photo);
        
        return {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(createdPhoto)
        };
    } catch (error) {
        context.error('Error uploading photo:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to upload photo' })
        };
    }
    }
});

// DELETE /api/photos/{id} - Delete a photo
app.http('deletePhoto', {
    methods: ['DELETE'],
    authLevel: 'function',
    route: 'photos/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const photoId = request.params.id;
        
        // TODO: Check if user has permission to delete this photo (owner or admin)
        
        await cosmosService.deletePhoto(photoId);
        
        // TODO: Delete file from Azure Blob Storage
        
        return {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        };
    } catch (error) {
        context.error('Error deleting photo:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to delete photo' })
        };
    }
    }
});

// GET /api/photos/upload-url - Get upload URL for photo
app.http('getPhotoUploadUrl', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'photos/upload-url',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const eventId = request.query.get('eventId');
        const userId = request.query.get('userId');
        
        if (!eventId || !userId) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Event ID and User ID are required' })
            };
        }
        
        // TODO: Generate SAS URL for Azure Blob Storage upload
        // For now, return a placeholder
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                uploadUrl: 'https://placeholder-upload-url.com',
                photoId: uuidv4()
            })
        };
    } catch (error) {
        context.error('Error getting upload URL:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to get upload URL' })
        };
    }
    }
});
