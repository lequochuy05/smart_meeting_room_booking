# Mobile API Contract

This contract defines stable feature-facing operations for the room and booking mobile flows.
All date-time values use ISO-8601 with timezone offsets. The company-wide timezone controls display; it does
not change the stored unambiguous date-time value.

## Authentication

- `POST /auth/login`: authenticate an employee and return session information
- `POST /auth/logout`: invalidate the current session
- `GET /auth/me`: return the current employee

## Rooms

- `GET /rooms`: list rooms
- Query filters: `date`, `startTime`, `endTime`, `minimumCapacity`, `equipment[]`
- `GET /rooms/{roomId}`: return room details
- `GET /rooms/{roomId}/schedule?date={date}`: return booked periods and derived available slots

## Participants

- `GET /employees/search?query={query}`: search company employees for participant selection

## Bookings

- `GET /bookings/mine?status=upcoming|past`: list the current employee's meetings
- `POST /bookings`: create a booking
- `POST /bookings/{bookingId}/check-in`: check in when the server validates the check-in window
- `POST /bookings/{bookingId}/cancel`: cancel when the server validates the cancellation window

## Response Envelope

Success responses return the requested domain object or collection. Mutation responses include the resulting
booking state.

Errors use a consistent JSON shape:

- `code`: stable machine-readable error code
- `message`: employee-facing message
- `fieldErrors`: optional field-specific validation messages

## Required Conflict Behavior

`POST /bookings` must return a conflict result before creating a booking when the room and time overlap an
active booking. The mobile client must also run the same rule locally for immediate feedback, but local
validation cannot replace server revalidation.

## Adapter Behavior

The real API adapter and standalone mock/local adapter must implement the same operations and normalized
error shape. Adapter selection must occur outside feature modules so Rooms, Bookings, and Auth remain
transport-independent.
