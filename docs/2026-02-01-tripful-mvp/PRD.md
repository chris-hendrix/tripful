---
date: 2026-02-01
topic: Tripful - Collaborative Trip Itinerary Platform PRD (v2)
---

# Tripful - Collaborative Trip Itinerary Platform

## Overview

A collaborative trip planning platform that makes group travel itineraries simple. Organizers create trips, invite members via phone, and accepted members collaboratively build the itinerary together. Perfect for bachelor parties, ski trips, weddings, and any group travel.

## Goals

1. Make group trip planning as simple as possible - collaborative by default
2. Enable accepted members to contribute to the itinerary (travel, meals, activities)
3. Provide a shared source of truth for group trip plans
4. Leverage phone numbers for seamless invitations (SMS-native like Partiful)
5. Focus on itinerary clarity with day-by-day and type-based views
6. Support multi-city trips where location changes during the trip

## Target Users

- **Primary**: Group trip organizers (bachelor/bachelorette parties, destination weddings, ski trips, friend vacations)
- **Secondary**: Event coordinators needing shared itineraries (corporate retreats, family reunions)

## Terminology

| Term | Definition |
|------|-----------|
| **Trip** | The overall group travel plan (equivalent to "Event" in Partiful) |
| **Event** | Individual items in the trip itinerary (flights, dinners, activities, etc.) |
| **Organizer** | Trip creator and co-organizers (equivalent to "Host" in Partiful) |
| **Member** | People invited to/attending the trip (equivalent to "Guest" in Partiful) |

## Design Considerations

### Multi-City Trips & Location Changes

Trips often involve multiple destinations (e.g., "Paris → Amsterdam → London" or "Miami → Key West → Miami"). Tripful handles this through **Travel events**:

- **Travel events** (flights, trains, drives, ferries, etc.) represent transitions between locations
- The `location` field on Travel events uses arrow notation to show the transition: "Miami → Key West"
- In the day-by-day view, Travel events naturally show when the group is moving to a new location
- The trip's `destination` field represents the primary or overall destination (e.g., "Florida Keys" or "Europe")
- Each event's individual `location` field shows where that specific activity takes place

**Example**: A bachelor party road trip
- Trip destination: "Florida Keys"
- Day 1: Flight to Miami (location: "JFK → MIA")
- Day 1: Dinner in Miami (location: "Miami Beach")
- Day 2: Drive to Key West (location: "Miami → Key West")
- Day 2: Sunset cruise (location: "Key West Marina")
- Day 4: Drive back (location: "Key West → Miami")
- Day 4: Flight home (location: "MIA → JFK")

This approach:
- Works for any trip type (multi-city, road trips, cruises)
- Doesn't require complex trip segmentation
- Leverages existing event types and fields
- Shows location changes naturally in the timeline

## Core User Flows

### 1. User Registration & Authentication
- User enters phone number
- Receives SMS verification code
- Enters code to authenticate
- Sets display name and optional profile photo
- Account created and authenticated

### 2. Trip Creation
- User clicks "Create Trip"
- Enters trip details:
  - Trip name (required)
  - Destination/Location (required)
  - Date range (optional - start and end dates)
  - Trip timezone (required - defaults to user's local timezone, can be changed if trip is in different timezone)
  - Description (optional - supports line breaks)
  - Cover image (optional)
- User adds co-organizers by phone number (optional)
- Trip is created with unique shareable link
- Creator can send invites via SMS to phone numbers

### 3. Trip Invitation
- Organizer enters phone numbers of invitees
- System sends SMS with trip link and preview
- Invitees receive text: "[Organizer] invited you to [Trip]! [Link]"
- Recipients can also receive link via share functionality

### 4. Member RSVP & Preview
- Invited member clicks trip link
- If not logged in, prompted to authenticate with phone number
- Member sees **partial preview**:
  - Trip name
  - Destination
  - Date range (if set)
  - Description
  - Organizer names
  - Cover image
  - **Does NOT see**: Itinerary events until they RSVP
- Member selects response:
  - "Going" (accept)
  - "Not Going" (decline)
  - "Maybe" (tentative)
- RSVP is recorded and organizer is notified
- **Only "Going" members can add events to itinerary**

### 5. Viewing Trip Itinerary
- Accepted members (Going status) view full trip itinerary
- User can toggle between viewing dates/times in:
  - **Trip timezone** (default): All dates/times shown in the trip's timezone
  - **Local timezone**: All dates/times converted to user's local timezone
- Default view: **Day-by-day grouping** (events organized by date)
- Alternative view: **Group by event type** (all Travel together, all Meals together, etc.)
- Each event displays:
  - Type badge (Travel/Accommodation/Meal/Activity)
  - Event title
  - Date and time (or "All day")
  - Location (if specified)
  - Description
  - Links (if attached)
  - Created by (member name + profile pic)
  - Optional badge (if marked as optional)
  - "Member no longer attending" indicator (if creator has changed RSVP to Not Going/Maybe)

### 6. Adding Events to Itinerary
- **Only accepted members** (Going status) can add events
- Member clicks "Add Event"
- Enters event details:
  - Type (required): Travel / Accommodation / Meal / Activity & Other
    - **Travel events** represent flights, trains, drives, and other transportation - they naturally indicate location changes
  - Title/Name (required)
  - Date (required - can be start date only or start + end date for multi-day)
  - Time (optional - or check "All day")
    - Start time (required if not all day)
    - End time (optional - for time ranges like "7:30 PM - 9:30 PM")
  - Location (optional)
    - For Travel events, use arrow notation to show transitions (e.g., "Miami → Key West" or "JFK → MIA")
  - Description (optional - supports line breaks)
  - Links (optional - URLs for bookings, restaurants, etc.)
  - Mark as "Optional" (checkbox - default is everyone)
  - Who is this event for? (defaults based on event type)
    - **Travel events**: Default to creator only (individual travel like flights)
    - **Other event types**: Default to "All" (everyone attending)
    - Can select "All" (everyone) or specific members
    - Example: If organizer adds "Tom's flight to Miami", select Tom
    - Example: If Sarah books a dinner reservation for everyone, use "All"
- Event is added to itinerary
- All accepted members see the new event
- Event creator is displayed on the event
- When assigned to specific members, their avatars are displayed on the event card (visible without expanding)
- When assigned to "All", no specific avatars shown (or show "Everyone")

### 7. Editing & Deleting Events
- **Event creator** can edit or delete their own events
- **Organizers** can edit, delete, or restore any event (including events from members who left)
- Editing updates the event for all members
- Deleting removes the event from the itinerary (soft delete - can be restored by organizers)
- Deleted events are not visible to members (only organizers see them in a "Deleted Events" section)

### 8. Trip Management
- Organizers view member list with RSVP statuses
- Organizers can edit trip details (including timezone)
- Organizers can add/remove co-organizers
- Co-organizers have same permissions as creator
- Organizers can remove members from the trip
- Organizers can cancel trip (notifies all members)

### 9. Member Experience
- Members view upcoming trips they're invited to
- Members see trips they've RSVP'd "Going" to with full itinerary
- Members can update their RSVP status
- Members receive notifications for trip invites and cancellations
- Members can choose to view all dates/times in trip timezone or their local timezone

### 10. Member Status Changes
- When a member changes from "Going" to "Maybe" or "Not Going":
  - Their events remain in the itinerary
  - Events show "Member no longer attending" indicator next to creator name
  - Member can no longer add new events
  - Member can no longer edit their existing events
  - Organizers can still edit/delete these events
- When a member changes from "Maybe/Not Going" back to "Going":
  - "Member no longer attending" indicator is removed
  - Member can add new events again
  - Member can edit their existing events again

## Acceptance Criteria

### AC1: User Authentication
**Given** a new user wants to create an account
**When** they enter their phone number and verify via SMS code
**Then** they should be authenticated and able to create trips

**Given** an existing user returns to the platform
**When** they enter their phone number and verify via SMS code
**Then** they should be logged into their existing account

**Given** a user enters an invalid phone number
**When** they attempt to send verification code
**Then** they should see an error message "Please enter a valid phone number"

**Given** a user enters an incorrect verification code
**When** they attempt to authenticate
**Then** they should see an error message "Invalid code. Please try again" and be able to request a new code

### AC2: Trip Creation
**Given** an authenticated user wants to create a trip
**When** they complete the trip form with:
- Trip name (3-100 characters)
- Destination (required)
- Optional date range (start and end dates)
- Trip timezone (defaults to user's local timezone, can be changed)
- Optional description (max 2000 characters, with line breaks preserved)
- Optional cover image (max 5MB, JPG/PNG/WEBP)
**Then** the trip should be created with a unique shareable link
**And** the user should be set as the trip organizer
**And** all dates and times for this trip should be stored in UTC

**Given** an organizer is creating a trip
**When** they add co-organizer phone numbers
**Then** those users should be added as co-organizers with full management permissions

**Given** a user tries to create a trip with a name shorter than 3 characters
**When** they submit the form
**Then** they should see validation error "Trip name must be at least 3 characters"

**Given** a user tries to upload a cover image larger than 5MB
**When** they select the file
**Then** they should see an error "Image must be under 5MB. Please choose a smaller file."

### AC3: Trip Invitation
**Given** an organizer has created a trip
**When** they enter member phone numbers and send invitations
**Then** each invitee should receive an SMS with trip details and link
**And** the link should direct to the trip page

**Given** a user receives a trip invitation link
**When** they click the link without being authenticated
**Then** they should be prompted to log in via phone verification
**And** after authentication, see the trip preview

**Given** an organizer tries to invite more than 100 members to a trip
**When** they attempt to add the 101st member
**Then** they should see an error "Maximum 100 members per trip. Please create a separate trip for additional guests."

**Given** SMS delivery fails for an invitation
**When** the system attempts to send
**Then** the organizer should see "Could not send invitation to [phone number]. Please verify the number and try again."
**And** the invitation should be marked as failed (can be resent)

### AC4: Partial Preview for Invited Members
**Given** an invited member views a trip they haven't RSVP'd to
**When** they access the trip page
**Then** they should see:
- Trip name
- Destination
- Date range (if set, displayed in trip timezone)
- Description
- Organizer names and profile pictures
- Cover image
- RSVP buttons

**And** they should NOT see:
- The itinerary events list
- Event details
- Member list

### AC5: Member RSVP Management
**Given** an authenticated user views a trip they're invited to
**When** they select "Going", "Not Going", or "Maybe"
**Then** their RSVP status should be saved and visible to the organizer
**And** the member count should update accordingly

**Given** a member has already RSVP'd to a trip
**When** they change their RSVP status
**Then** their new status should be saved and the organizer should be notified

**Given** a member RSVPs "Going" for the first time
**When** their RSVP is saved
**Then** they should now see the full trip itinerary
**And** they should be able to add events to the itinerary

**Given** a member with RSVP status "Going" who has created events changes to "Maybe" or "Not Going"
**When** their RSVP is updated
**Then** their events should remain in the itinerary
**And** each of their events should display "Member no longer attending" indicator
**And** they should no longer be able to add new events
**And** they should no longer be able to edit their existing events

**Given** a member changes from "Maybe" or "Not Going" back to "Going"
**When** their RSVP is updated
**Then** the "Member no longer attending" indicator should be removed from their events
**And** they should be able to add new events again
**And** they should be able to edit their existing events again

### AC6: Adding Events to Itinerary
**Given** a member has RSVP'd "Going" to a trip
**When** they add an event to the itinerary with:
- Type (Travel/Accommodation/Meal/Activity)
- Title (3-200 characters)
- Date (with optional end date for multi-day events)
- Optional time or "All day" flag
- Optional location (max 500 characters)
- Optional description (max 2000 characters)
- Optional links (max 10 URLs)
- Optional "Optional" attendance flag
**Then** the event should be added to the trip itinerary
**And** all accepted members should see the new event
**And** the event should show who created it

**Given** a member has RSVP'd "Maybe" or "Not Going"
**When** they try to add an event
**Then** they should be prevented from adding events
**And** shown a message "Only members who are attending can add events to the itinerary"

**Given** an event is marked as "All day"
**When** displayed in the itinerary
**Then** it should not show a specific time

**Given** an event has both start time and end time
**When** displayed in the itinerary
**Then** it should show the time range (e.g., "7:30 PM - 9:30 PM")

**Given** an event has only a start time (no end time)
**When** displayed in the itinerary
**Then** it should show only the start time (e.g., "7:30 PM")

**Given** an event spans multiple days (accommodation, multi-day activity)
**When** the event is created with start and end dates
**Then** it should appear as a card under each day in the day-by-day view

**Given** a member adds a Travel event representing a location change
**When** they set the location field with arrow notation (e.g., "Miami → Key West")
**Then** the event should display the full transition in the itinerary
**And** clearly indicate the group is moving to a new location

**Given** a member adds a Travel event without changing the default
**When** they submit the form
**Then** the event should be assigned to the creator only
**And** the creator's avatar should be displayed on the event card

**Given** a member adds a non-Travel event (Meal, Accommodation, Activity) without changing the default
**When** they submit the form
**Then** the event should be assigned to "All" (everyone)
**And** no specific avatars should be displayed on the collapsed card (or show "Everyone" badge)

**Given** a member adds an event and selects "All"
**When** they submit the form
**Then** the event should be marked as for everyone
**And** the stored value should indicate "All" (not individual member IDs)

**Given** an organizer adds an event for specific members (e.g., "Tom's flight")
**When** they select Tom in the "Who is this event for?" field and submit
**Then** the event should be assigned to Tom
**And** Tom's avatar should be displayed on the event card
**And** hovering over the avatar should show "Tom Rodriguez"

**Given** a member adds an event for multiple specific members
**When** they select multiple members in the "Who is this event for?" field
**Then** all selected member avatars should be displayed on the event card
**And** hovering over each avatar should show the respective member's name

**Given** a member tries to add an event with a title shorter than 3 characters
**When** they submit the form
**Then** they should see validation error "Event title must be at least 3 characters"

**Given** a trip has 200 events
**When** a member tries to add the 201st event
**Then** they should see an error "Maximum 200 events per trip reached. Please consolidate or remove old events."

### AC7: Event Permissions
**Given** a member views an event they created (and has "Going" status)
**When** they access the event options
**Then** they should be able to edit or delete the event

**Given** a member views an event they created (but has changed to "Maybe" or "Not Going")
**When** they access the event
**Then** they should NOT see edit or delete options (view only)
**And** the event should display "Member no longer attending" indicator

**Given** a member views an event created by another member
**When** they access the event
**Then** they should NOT see edit or delete options (view only)

**Given** an organizer views any event in the itinerary
**When** they access the event options
**Then** they should be able to edit, delete, or restore the event (regardless of creator or creator's current RSVP status)

**Given** an organizer deletes an event
**When** the deletion is confirmed
**Then** the event should be removed from the itinerary for all members
**And** the event should appear in the organizer's "Deleted Events" section (soft delete)

**Given** an organizer views a deleted event
**When** they access the deleted event
**Then** they should see a "Restore" option to bring the event back to the itinerary

### AC8: Itinerary View Modes
**Given** an accepted member views a trip itinerary
**When** the page loads (default view)
**Then** events should be displayed in **day-by-day grouping**:
- Events grouped under each date
- Multi-day events appear as a card under each relevant day
- Events within each day sorted by time
- "All day" events appear first within each day
- All dates/times displayed in trip timezone by default

**Given** a member is viewing the day-by-day itinerary
**When** they toggle to "Group by type" view
**Then** events should be reorganized by type:
- All Travel events together
- All Accommodation events together
- All Meal events together
- All Activity & Other events together
- Within each type, sorted by date/time
- All dates/times displayed in selected timezone (trip or local)

**Given** a member is viewing events in trip timezone
**When** they toggle to "Show in my timezone"
**Then** all dates and times should be converted to and displayed in the member's local timezone
**And** timezone indicator should show "Showing times in your timezone (PST)" or similar

**Given** a member is viewing events in their local timezone
**When** they toggle back to "Show in trip timezone"
**Then** all dates and times should be displayed in the trip's timezone
**And** timezone indicator should show "Showing times in trip timezone (EST)" or similar

### AC9: Trip Dashboard
**Given** an authenticated user accesses their dashboard
**When** the page loads
**Then** they should see two sections:
- **Upcoming Trips**: All future trips (organizing or Going status) sorted by date
- **Past Trips**: All trips that have ended, sorted by date (most recent first)

**And** each trip card should display:
- Cover image (if uploaded)
- Trip name
- Destination
- Date range (if set, in trip timezone)
- Organizer name(s) with profile picture(s)
- "Organizing" badge if user is organizer/co-organizer
- RSVP status (Going/Maybe/Not Going) if user is a member
- Event count (e.g., "12 events planned")
- Click to view trip details

### AC10: Trip Management
**Given** an organizer views their trip
**When** they access the trip management page
**Then** they should see:
- Full member list with RSVP statuses (Going/Not Going/Maybe/No Response)
- Total counts for each RSVP type
- Options to edit trip details (name, destination, dates, timezone, description)
- Options to add/remove co-organizers
- Options to remove members
- Option to cancel trip
- "Deleted Events" section showing soft-deleted events

**Given** a co-organizer accesses a trip they co-organize
**When** they view the trip management page
**Then** they should have the same permissions as the original organizer

**Given** an organizer removes a member from a trip
**When** the removal is confirmed
**Then** the member should be removed from the member list
**And** the removed member should no longer see the trip in their dashboard
**And** events created by that member should remain in the itinerary
**And** those events should display "Member no longer attending" indicator

**Given** an organizer tries to remove the last organizer (themselves) without assigning a new organizer
**When** they attempt the removal
**Then** they should see an error "Cannot remove the last organizer. Please add a co-organizer first or cancel the trip."

### AC11: Trip Updates & Cancellation
**Given** an organizer updates trip details (dates, destination, description, timezone)
**When** they save the changes
**Then** all invited members should receive a notification of the update

**Given** an organizer changes the trip timezone
**When** they save the change
**Then** all event dates/times should continue to represent the same moment in time (UTC unchanged)
**And** display to all members in the new trip timezone

**Given** an organizer wants to cancel a trip
**When** they select "Cancel Trip" and confirm
**Then** the trip should be marked as cancelled
**And** all invited members should receive a cancellation notification
**And** the trip should no longer appear in upcoming trips

**Given** a network error occurs while saving trip updates
**When** the save fails
**Then** the user should see "Unable to save changes. Please check your connection and try again."
**And** changes should not be lost (remain in the form)

### AC12: Event Display Details
**Given** a member views an event in the itinerary
**When** the event is displayed (collapsed view)
**Then** they should see:
- Type badge with color coding (Travel/Accommodation/Meal/Activity)
- Event title
- Date and time in selected timezone (or "All day")
- Location (if provided)
- **If assigned to specific members**: Avatars (profile pictures) with hover tooltip showing names
- **If assigned to "All"**: "👥 Everyone" badge
- "Optional" badge if marked as optional
- Expand icon to view full details

**Given** a member expands an event in the itinerary
**When** the event details are shown
**Then** they should additionally see:
- Duration display for multi-day events (e.g., "Oct 10-12")
- Description with line breaks preserved
- Links as clickable URLs (if provided, max 10 displayed)
- Creator name and profile picture ("Added by [name]")
- "Member no longer attending" indicator if creator has changed RSVP status
- Edit button (if permitted)

**Given** an event has links attached
**When** the event is displayed
**Then** each link should be clickable and open in a new tab

### AC13: Link Sharing
**Given** an organizer has created a trip
**When** they access the share functionality
**Then** they should be able to copy the trip link
**And** anyone with the link should be able to view the trip preview (after authentication)
**And** after RSVP'ing "Going", see the full itinerary

## Data Validation Requirements

### Trip Constraints
- Trip name: 3-100 characters
- Destination: Required, max 500 characters
- Description: Max 2000 characters
- Cover image: Max 5MB, formats: JPG, PNG, WEBP
- Maximum members per trip: 100
- Maximum events per trip: 200
- Trip timezone: Must be a valid IANA timezone identifier

### Event Constraints
- Event title: 3-200 characters
- Event description: Max 2000 characters
- Event location: Max 500 characters
- Links: Max 10 URLs per event, each must be valid HTTP/HTTPS URL
- Start date: Required
- End date: Optional, must be >= start date if provided
- Start time: Required if not "all day"
- End time: Optional, must be > start time if provided

### User Constraints
- Display name: 3-50 characters
- Phone number: Must be valid E.164 format

## Technical Requirements

### Platform
- Web application (responsive, mobile-first design)
- Accessible from any modern browser
- Progressive Web App (PWA) capabilities for mobile

### Authentication
- Phone number as primary identifier
- SMS verification via Twilio or similar
- JWT-based session management
- Secure token storage

### Core Entities

#### User
- id (UUID)
- phone_number (unique, indexed)
- display_name
- profile_photo_url (optional)
- timezone (IANA timezone identifier)
- created_at
- updated_at

#### Trip
- id (UUID)
- name
- destination (text)
- start_date (date, optional)
- end_date (date, optional)
- timezone (IANA timezone identifier, required)
- description (text, optional - preserves line breaks)
- cover_image_url (optional)
- created_by (user_id)
- created_at
- updated_at
- cancelled (boolean)
- share_link (unique slug)

#### TripCoOrganizer
- trip_id
- user_id
- added_at

#### TripInvitation
- id (UUID)
- trip_id
- inviter_id (user_id)
- invitee_phone_number
- status (pending, accepted, declined, failed)
- sent_at
- responded_at (optional)

#### TripRSVP
- trip_id
- user_id
- status (going, not_going, maybe)
- updated_at

#### TripEvent (Itinerary Items)
- id (UUID)
- trip_id
- created_by (user_id)
- assigned_to (JSON: "all" or array of user_ids, defaults based on event_type)
  - Travel events: defaults to [created_by]
  - Other events: defaults to "all"
- event_type (enum: travel, accommodation, meal, activity_other)
- title (text)
- start_date (date)
- end_date (date, optional - for multi-day events)
- start_time (time, optional)
- end_time (time, optional)
- all_day (boolean, default false)
- location (text, optional)
- description (text, optional - preserves line breaks)
- links (JSON array of URLs, optional, max 10)
- is_optional (boolean, default false - false means "everyone")
- deleted (boolean, default false - soft delete)
- deleted_at (timestamp, optional)
- deleted_by (user_id, optional)
- created_at
- updated_at

**Note**: All dates and times are stored in UTC and converted to trip timezone or user's local timezone for display.

### Key Features

#### SMS Integration
- Send invitation messages with trip details
- Send trip update notifications
- Send cancellation notifications
- Handle opt-out/unsubscribe

#### Trip Management
- CRUD operations for trips
- Co-organizer management
- Member list management
- RSVP tracking
- Timezone management

#### Itinerary Management
- CRUD operations for events (with creator permissions)
- Day-by-day grouping view
- Group by type view
- Multi-day event support
- Event type categorization
- Soft delete with restore capability

#### Timezone Handling
- Store all dates/times in UTC
- Display in trip timezone by default
- Allow users to toggle to their local timezone
- Handle timezone conversions for all date/time displays

#### Notifications (MVP Scope)
- SMS notifications for:
  - Trip invitations
  - Trip cancellations
  - RSVP changes (for organizers)
  - Trip updates (date/time/location changes)
- Future: Event additions, event changes

### Security & Privacy
- Phone numbers stored securely (hashed)
- Rate limiting on SMS sends
- Trip links use non-guessable slugs
- Invited members can only view trip preview until RSVP "Going"
- Only accepted members can add events
- Only event creators (with Going status) or organizers can edit/delete events
- Co-organizers have same permissions as creators
- Soft delete allows recovery of accidentally deleted events

### Performance
- Trip page loads in <2 seconds
- RSVP actions complete in <1 second
- Itinerary view renders efficiently with 50+ events
- Support for trips with up to 100 members
- Support for trips with up to 200 events

### Error Handling

Users should see clear, actionable error messages for:
- Invalid phone numbers
- Incorrect verification codes
- SMS delivery failures
- Network connectivity issues
- File upload errors (size, format)
- Validation errors (character limits, required fields)
- Concurrent edit conflicts
- Permission errors

## Out of Scope (Future Enhancements)

### MVP Phase 2 Features
- Search functionality for trips
- Advanced trip filtering tabs (Organizing, Attending, Past)
- Notification center UI
- Rich text formatting in descriptions (bold, bullets, links)
- Social sharing buttons
- Map integration for locations
- Copy address to clipboard
- File uploads for events (PDFs, images, confirmations)
- Per-event RSVP tracking (who's attending which event)
- Event comments/discussion threads
- Configurable notification preferences
- Event reminders
- Link preview metadata (title, image)

### Future Features
- Cost/budget tracking per event
- Split payment calculations
- Comments/chat functionality
- Photo sharing per event or trip
- Calendar integration (export to Google Calendar, iCal)
- Email invitations (in addition to SMS)
- Trip templates (ski trip template, wedding template, etc.)
- Recurring trips
- Polls or voting on event options
- Packing list feature
- Weather integration
- Travel time calculations
- Public trip discovery
- Trip duplication/copying

## Success Metrics

1. **User Engagement**
   - % of invited members who create accounts
   - % of members who RSVP within 24 hours
   - Average time to create a trip
   - Average number of events per trip

2. **Collaboration Metrics**
   - % of trips with multiple event creators (not just organizer)
   - Average number of event contributors per trip
   - % of members who add at least one event

3. **Platform Health**
   - SMS delivery success rate (>95%)
   - Trip creation success rate
   - User retention (return users within 30 days)
   - Error rate (target <1% of user actions)

## Technical Stack Recommendations

### Frontend
- React or Next.js
- Tailwind CSS for styling
- Mobile-first responsive design
- Date picker component for date ranges
- Timezone picker component

### Backend
- Node.js + Express or Python + FastAPI
- PostgreSQL database
- Redis for caching and sessions

### Infrastructure
- Cloud hosting (Vercel, Railway, or AWS)
- Twilio for SMS
- CloudFlare for CDN and DDoS protection
- S3 or similar for image storage

### Third-party Services
- Twilio (SMS)
- SendGrid (email notifications - secondary)
- Sentry (error tracking)
- Analytics (PostHog or Mixpanel)

## Timeline Estimate

This is an MVP scoped for 6-8 week development cycle with a single full-stack engineer.

**Phase 1 (Week 1-2)**: Core auth and trip creation (reuse Partiful base)
**Phase 2 (Week 2-4)**: Invitations, RSVP, and partial preview system
**Phase 3 (Week 4-6)**: Event creation and itinerary management with timezone support
**Phase 4 (Week 6-7)**: View modes (day-by-day, group by type), permissions, and member status handling
**Phase 5 (Week 7-8)**: Testing, error handling, and deployment

## Open Questions

1. Should there be a limit on number of co-organizers per trip?
2. Should members be able to suggest events (pending organizer approval)?
3. What's the UX for handling international phone numbers?
4. Should there be any trip privacy settings (public vs private links)?
5. Should organizers be able to lock the itinerary (prevent new events)?
6. How long should deleted events be retained before permanent deletion?
7. Should there be an undo feature for recent deletions?

## Appendix: User Stories

### Organizer Stories
- As an organizer, I want to create a trip quickly so I can start inviting friends
- As an organizer, I want to add co-organizers so I can share planning responsibilities
- As an organizer, I want to see who's coming so I can plan accordingly
- As an organizer, I want everyone attending to collaborate on the itinerary
- As an organizer, I want to update trip details and notify members of changes
- As an organizer, I want to cancel a trip if plans change
- As an organizer, I want to set the trip timezone so everyone sees times correctly
- As an organizer, I want to restore accidentally deleted events
- As an organizer, I want to remove members who are no longer coming

### Member Stories
- As a member, I want to see basic trip info before deciding to RSVP
- As a member, I want to RSVP quickly without a complex profile
- As a member, I want to add events to the itinerary once I'm attending
- As a member, I want to see what everyone has planned day-by-day
- As a member, I want to edit events I created if details change
- As a member, I want to see who created each event
- As a member, I want to add links to bookings so everyone has access
- As a member, I want to mark events as optional so people know they can skip
- As a member, I want to view times in my local timezone when traveling
- As a member, I want my events to remain visible even if I change my RSVP to Maybe

### Platform Stories
- As the system, I need to prevent spam by rate-limiting SMS sends
- As the system, I need to ensure only accepted members can add events
- As the system, I need to maintain trip data integrity with co-organizers
- As the system, I need to show partial previews to un-RSVP'd invitees
- As the system, I need to handle timezone conversions accurately
- As the system, I need to show clear error messages when things go wrong

## Key Differences from Partiful

| Feature | Partiful | Tripful |
|---------|----------|---------|
| Main entity | Event (party) | Trip (group travel) |
| Sub-items | N/A | Events (itinerary items) |
| Terminology | Hosts & Guests | Organizers & Members |
| Collaboration | Host-only content | Accepted members add events |
| Date structure | Single date/time | Optional date range + event dates |
| Timezone | Single timezone | Trip timezone + user can toggle to local |
| Content types | Event details | Categorized events (Travel/Meal/Activity) |
| Views | Single event view | Day-by-day + Group by type |
| Preview | Full event details | Partial preview until RSVP |
| Member status changes | N/A | Events persist with indicator when member leaves |
