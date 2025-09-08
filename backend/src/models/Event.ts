export interface Event {
    id: string;
    title: string;
    description: string;
    date: string; // ISO date string
    time: string; // HH:MM format
    location: string;
    type: EventType;
    isPrivate: boolean;
    accessCode?: string; // For private events
    capacity?: number;
    creatorId: string;
    creatorName: string;
    isOfficial: boolean; // Faculty-created events
    attendees: string[]; // Array of user IDs
    createdAt: string; // ISO timestamp
    updatedAt: string; // ISO timestamp
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    customFields?: CustomField[];
}

export type EventType = 'academic' | 'social' | 'sports' | 'cultural' | 'other';

export interface CustomField {
    id: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'select' | 'textarea';
    required: boolean;
    options?: string[]; // For select fields
}

export interface EventRegistration {
    id: string;
    eventId: string;
    userId: string;
    userEmail: string;
    userName: string;
    registrationData: Record<string, any>; // Custom field responses
    registeredAt: string; // ISO timestamp
}

export interface CreateEventRequest {
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    type: EventType;
    isPrivate: boolean;
    capacity?: number;
    customFields?: CustomField[];
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
    id: string;
}
