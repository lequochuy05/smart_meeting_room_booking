# Quickstart Validation: Smart Room Booking

## Prerequisites

- Node.js and npm or pnpm
- Expo CLI available through the project package scripts
- Android emulator, iOS simulator, or Expo-compatible physical device

## Expected Setup

1. Install project dependencies and start Expo.
2. Select the local/mock API adapter for independent operation.
3. Seed sample rooms, equipment, employees, and bookings before the first run.
4. Confirm the app opens on the Rooms tab.

## Core Validation Scenarios

### Room Search

1. Open Rooms.
2. Filter by date, desired time range, minimum capacity, and equipment.
3. Verify only matching rooms appear.
4. Verify loading, empty, and network-error states are reachable.

**Success**: Matching and non-matching rooms are handled correctly, and no stale result replaces a failed request.

### Room Timeline

1. Open a room from search results.
2. Review its timeline for the selected date.
3. Select an available slot and open booking entry.

**Success**: Booked and available periods are distinct, and adjacent non-overlapping ranges remain selectable.

### Booking Creation

1. Enter a title, date, start, end, and employee participants.
2. Submit an available range.
3. Verify the booking appears in Upcoming meetings.
4. Repeat with an overlapping range.

**Success**: The available range creates exactly one booking; the overlapping range is rejected immediately and remains blocked until corrected.

### Check-in and Cancellation

1. Open My Bookings.
2. Locate a meeting within the 15-minute-before to 15-minute-after check-in window.
3. Check in and verify status updates.
4. Locate an upcoming cancellable meeting and cancel it after confirmation.

**Success**: Eligible actions update the meeting state and show confirmation; ineligible actions are disabled with an explanation.

## Test Commands

- Run unit tests for slot availability and booking-time validation.
- Run component tests for loading, empty, error, booking form, and timeline states.
- Run the mobile app for manual scenario validation.

Exact package scripts belong in the implementation plan and must be discovered from the generated Expo package manifest.
