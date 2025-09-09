export interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    type: EventType;
    isPrivate: boolean;
    accessCode?: string;
    capacity?: number;
    creatorId: string;
    creatorName: string;
    isOfficial: boolean;
    attendees: string[];
    createdAt: string;
    updatedAt: string;
    coordinates?: { latitude: number; longitude: number; };
    customFields?: CustomField[];
}

export type EventType = 'academic' | 'social' | 'sports' | 'cultural' | 'other';

export interface CustomField {
    id: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'select' | 'textarea';
    required: boolean;
    options?: string[];
}

export interface EventRegistration {
    id: string;
    eventId: string;
    userId: string;
    userEmail: string;
    userName: string;
    registrationData: Record<string, any>;
    registeredAt: string;
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

export interface UpdateEventRequest extends Partial<CreateEventRequest> { id: string; }


