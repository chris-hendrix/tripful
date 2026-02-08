/**
 * Event types and response interfaces
 */

/**
 * Event entity
 */
export interface Event {
  id: string;
  tripId: string;
  createdBy: string;
  name: string;
  description: string | null;
  eventType: "travel" | "meal" | "activity";
  location: string | null;
  startTime: Date;
  endTime: Date | null;
  allDay: boolean;
  isOptional: boolean;
  links: string[] | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API response for fetching multiple events
 */
export interface GetEventsResponse {
  success: true;
  events: Event[];
}

/**
 * API response for fetching a single event
 */
export interface GetEventResponse {
  success: true;
  event: Event;
}

/**
 * API response for creating an event
 */
export interface CreateEventResponse {
  success: true;
  event: Event;
}

/**
 * API response for updating an event
 */
export interface UpdateEventResponse {
  success: true;
  event: Event;
}

/**
 * API response for restoring an event
 */
export interface RestoreEventResponse {
  success: true;
  event: Event;
}
