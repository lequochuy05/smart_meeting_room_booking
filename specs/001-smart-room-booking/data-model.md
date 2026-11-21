# Data Model: Smart Room Booking

## Room

- `id`: stable unique identifier
- `name`: display name
- `capacity`: positive integer
- `floor`: floor or building area
- `equipment`: unique list of equipment identifiers
- `status`: `AVAILABLE`, `IN_USE`, or `UPCOMING_BOOKING`
- `timezone`: company timezone identifier

Validation: name and floor are required; capacity must be greater than zero; equipment values must be unique.

## Room Schedule

- `roomId`: reference to Room
- `date`: ISO-8601 date
- `bookings`: list of Booking entries that overlap the date
- `availableSlots`: derived 30-minute slots not overlapping a booking

The schedule is derived for a selected room and date; it is not independently mutable.

## Booking

- `id`: stable unique identifier
- `roomId`: reference to Room
- `ownerId`: authenticated employee identifier
- `title`: non-empty meeting title
- `startTime`: ISO-8601 date-time with timezone offset
- `endTime`: ISO-8601 date-time with timezone offset
- `participantIds`: list of employee identifiers
- `status`: `UPCOMING`, `CHECKED_IN`, `CANCELLED`, or `PAST`

Validation:

- title is required
- start and end must be valid ISO-8601 values
- end must be after start
- start must not be in the past
- participant identifiers must exist in the employee directory
- no overlapping active booking may exist for the same room
- cancellation requires status `UPCOMING` and start time not reached
- check-in requires status `UPCOMING` and time from 15 minutes before start through 15 minutes after start

## Participant

- `id`: employee directory identifier
- `name`: display name
- `email`: company email for display and resolution

## Equipment

- `id`: stable equipment identifier
- `name`: display name
- `category`: `DISPLAY`, `WHITEBOARD`, or `ONLINE_MEETING`

## State Transitions

- Booking creation: `UPCOMING`
- Eligible check-in: `UPCOMING` → `CHECKED_IN`
- Cancellation before start: `UPCOMING` or `CHECKED_IN` → `CANCELLED`
- Time passage after end: `UPCOMING` or `CHECKED_IN` → `PAST`

The server or local adapter is authoritative for state transitions. The mobile client never marks a booking
checked-in or cancelled without receiving or applying a successful adapter result.

## Relationships

- Room 1:N Booking
- Booking N:N Participant
- Room N:N Equipment
