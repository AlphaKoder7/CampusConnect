export interface Photo {
    id: string;
    eventId: string;
    userId: string;
    userName: string;
    fileName: string;
    fileUrl: string;
    thumbnailUrl?: string;
    caption?: string;
    uploadedAt: string; // ISO timestamp
    metadata?: {
        size: number;
        width: number;
        height: number;
        mimeType: string;
    };
}

export interface UploadPhotoRequest {
    eventId: string;
    userId: string;
    userName: string;
    caption?: string;
}

export interface PhotoGallery {
    eventId: string;
    photos: Photo[];
    totalCount: number;
}
