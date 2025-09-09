export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  maxAttendees: number;
  currentAttendees: number;
  creatorId: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  attendees: string[];
}
