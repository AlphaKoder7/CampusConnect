import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosService } from '../services/CosmosService';
import { User, CreateUserRequest } from '../models/User';
import { v4 as uuidv4 } from 'uuid';

const cosmosService = new CosmosService();

// GET /api/users/{id} - Get user by ID
app.http('getUserById', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'users/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const userId = request.params.id;
        
        // TODO: Check if user has permission to view this profile
        
        const user = await cosmosService.getUserById(userId);
        
        if (!user) {
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'User not found' })
            };
        }
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(user)
        };
    } catch (error) {
        context.error('Error fetching user:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to fetch user' })
        };
    }
    }
});

// GET /api/users/email/{email} - Get user by email
app.http('getUserByEmail', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'users/email/{email}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const email = request.params.email;
        
        const user = await cosmosService.getUserByEmail(email);
        
        if (!user) {
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'User not found' })
            };
        }
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(user)
        };
    } catch (error) {
        context.error('Error fetching user by email:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to fetch user' })
        };
    }
    }
});

// POST /api/users - Create new user
app.http('createUser', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'users',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const userData = await request.json() as unknown as CreateUserRequest;
        
        // Validate required fields
        if (!userData.email || !userData.name || !userData.role) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }
        
        // Check if user already exists
        const existingUser = await cosmosService.getUserByEmail(userData.email);
        if (existingUser) {
            return {
                status: 409,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'User already exists with this email' })
            };
        }
        
        const user: User = {
            id: uuidv4(),
            email: userData.email,
            name: userData.name,
            role: userData.role,
            department: userData.department,
            studentId: userData.studentId,
            facultyId: userData.facultyId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
                notifications: {
                    email: true,
                    push: true,
                    eventReminders: true,
                    newEvents: true
                },
                privacy: {
                    showEmail: false,
                    showProfile: true
                }
            }
        };
        
        const createdUser = await cosmosService.createUser(user);
        
        return {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(createdUser)
        };
    } catch (error) {
        context.error('Error creating user:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to create user' })
        };
    }
    }
});

// PUT /api/users/{id} - Update user
app.http('updateUser', {
    methods: ['PUT'],
    authLevel: 'function',
    route: 'users/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const userId = request.params.id;
        const updateData = await request.json() as unknown as Partial<User>;
        
        // TODO: Check if user has permission to update this profile
        
        const existingUser = await cosmosService.getUserById(userId);
        if (!existingUser) {
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'User not found' })
            };
        }
        
        const updatedUser = await cosmosService.updateUser(userId, updateData);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(updatedUser)
        };
    } catch (error) {
        context.error('Error updating user:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to update user' })
        };
    }
    }
});

// GET /api/users/{id}/events - Get user's created events
app.http('getUserEvents', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'users/{id}/events',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
        const userId = request.params.id;
        
        // TODO: Check if user has permission to view these events
        
        const events = await cosmosService.getEventsByCreator(userId);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(events)
        };
    } catch (error) {
        context.error('Error fetching user events:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to fetch user events' })
        };
    }
    }
});
