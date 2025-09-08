export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    profilePicture?: string;
    department?: string;
    studentId?: string; // For students
    facultyId?: string; // For faculty
    createdAt: string; // ISO timestamp
    updatedAt: string; // ISO timestamp
    preferences?: UserPreferences;
}

export type UserRole = 'student' | 'faculty' | 'admin';

export interface UserPreferences {
    notifications: {
        email: boolean;
        push: boolean;
        eventReminders: boolean;
        newEvents: boolean;
    };
    privacy: {
        showEmail: boolean;
        showProfile: boolean;
    };
}

export interface CreateUserRequest {
    email: string;
    name: string;
    role: UserRole;
    department?: string;
    studentId?: string;
    facultyId?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
    id: string;
    preferences?: UserPreferences;
}
