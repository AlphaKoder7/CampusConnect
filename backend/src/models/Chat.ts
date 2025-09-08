export interface ChatMessage {
    id: string;
    eventId: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: string; // ISO timestamp
    type: 'text' | 'system';
}

export interface ChatRoom {
    id: string;
    eventId: string;
    isActive: boolean;
    createdAt: string; // ISO timestamp
    participants: string[]; // Array of user IDs
}

export interface SendMessageRequest {
    eventId: string;
    message: string;
    userId: string;
    userName: string;
}
