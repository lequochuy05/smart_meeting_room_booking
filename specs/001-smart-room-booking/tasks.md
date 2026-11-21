# Tasks: Smart Room Booking

**Input**: Design documents from `/specs/001-smart-room-booking/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Expo mobile project and baseline tooling.

- [ ] T001 Initialize the Expo Managed Workflow project with TypeScript strict mode in package.json and app.json
- [ ] T002 Add Expo Router, Axios, TanStack Query, Zustand, React Hook Form, Zod, SecureStore, AsyncStorage/SQLite, Jest, and React Native Testing Library dependencies in package.json
- [ ] T003 [P] Create the feature-based source directories `src/app`, `src/features/rooms`, `src/features/bookings`, `src/features/auth`, `src/shared`, and `src/test` per specs/001-smart-room-booking/plan.md
- [ ] T004 [P] Configure strict TypeScript, path aliases, Jest, and React Native Testing Library setup in tsconfig.json and jest.config.js
- [ ] T005 [P] Configure Expo environment variables and runtime adapter selection in app.json and `src/shared/api/config.ts`
- [ ] T006 [P] Add reusable loading, empty, error, and retry UI components in `src/shared/components/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Implement the normalized API/adapter interface and error shape in `src/shared/api/types.ts` based on specs/001-smart-room-booking/contracts/mobile-api.md
- [ ] T008 Configure the Axios instance, authentication, request, response, and normalized error interceptors in `src/shared/api/client.ts`
- [ ] T009 [P] Implement SecureStore-backed session storage in `src/features/auth/services/sessionStorage.ts`
- [ ] T010 [P] Configure TanStack Query provider, cache defaults, and application query keys in `src/shared/api/queryClient.ts`
- [ ] T011 [P] Create the standalone JSON Server/local-storage adapter with seed data in `src/shared/api/mockAdapter.ts` and `src/shared/storage/seedData.ts`
- [ ] T012 [P] Implement the company-wide ISO-8601 and timezone utilities in `src/shared/utils/dateTime.ts` and unit tests in `src/test/unit/dateTime.test.ts`
- [ ] T013 Create the canonical domain types for Room, RoomSchedule, Booking, Participant, and Equipment in `src/features/*/types/`, using constraints from data-model.md
- [ ] T014 [P] Implement unit tests for room-time overlap and booking-time validation in `src/test/unit/bookingRules.test.ts` (adjacent boundaries, invalid ranges, past times, concurrent conflict attempts)
- [ ] T015 [P] Implement pure overlap and booking-time validation rules in `src/features/bookings/services/bookingRules.ts`
- [ ] T016 Configure Expo Router tabs and placeholders for Rooms, My Bookings, and Profile plus room/booking routes in `src/app/`

**Checkpoint**: Foundation ready; room, booking, and auth features may proceed independently.

---

## Phase 3: User Story 1 - Find an Available Meeting Room (Priority: P1) 🎯 MVP

**Goal**: Let employees search rooms, filter availability, inspect room details and timelines, and select an available slot.

**Independent Test**: Filter rooms and open a room timeline without creating a booking.

### Tests for User Story 1 (OPTIONAL - requested by the constitution) ⚠️

- [ ] T017 [P] [US1] Add unit/component tests for room filters, room matching, loading, empty, and error states in `src/features/rooms/components/__tests__/RoomSearch.test.tsx`
- [ ] T018 [P] [US1] Add unit/component tests for timeline rendering and available-slot selection in `src/features/rooms/components/__tests__/RoomTimeline.test.tsx`
- [ ] T019 [P] [US1] Add contract tests for room list, room detail, and schedule operations in `src/test/contract/roomApi.test.ts`

### Implementation for User Story 1

- [ ] T020 [P] [US1] Implement `Room`, `RoomSchedule`, and `Equipment` types from data-model.md in `src/features/rooms/types/room.ts`, enforcing `Room.capacity` positive, `Room.name` and `Room.floor` required, and unique equipment per data-model.md
- [ ] T021 [P] [US1] Implement the room API service for `GET /rooms`, `GET /rooms/{roomId}`, and `GET /rooms/{roomId}/schedule` in `src/features/rooms/services/roomService.ts`
- [ ] T022 [P] [US1] Implement room search/filter Zustand state in `src/features/rooms/hooks/useRoomFilters.ts`
- [ ] T023 [US1] Implement TanStack Query hooks for room lists and schedules in `src/features/rooms/hooks/useRooms.ts`
- [ ] T024 [US1] Build the optimized room list with FlashList and FlatList fallback in `src/features/rooms/components/RoomList.tsx`
- [ ] T025 [US1] Build room filter controls for date, start/end time, minimum capacity, and equipment in `src/features/rooms/components/RoomFilters.tsx`
- [ ] T026 [US1] Build a memoized daily timeline with 30-minute booked/available slots in `src/features/rooms/components/RoomTimeline.tsx`
- [ ] T027 [US1] Implement room detail and room timeline routes in `src/app/room/[roomId].tsx`
- [ ] T028 [US1] Wire loading, empty, retryable network-error, and stale-cache states into `src/features/rooms/components/RoomSearchScreen.tsx`
- [ ] T029 [US1] Open the booking form prefilled with the selected room and available slot from `src/features/rooms/components/RoomTimeline.tsx`

**Checkpoint**: User Story 1 is independently functional and testable for search, filtering, timeline, and slot selection.

---

## Phase 4: User Story 2 - Create a Conflict-Free Booking (Priority: P1)

**Goal**: Create a validated meeting booking while preventing same-room overlap and preserving form values after errors.

**Independent Test**: Submit an available range successfully and receive an immediate, blocked result for an overlapping range.

### Tests for User Story 2 (OPTIONAL - requested by the constitution) ⚠️

- [ ] T030 [P] [US2] Add Jest tests for booking fields and overlap rules in `src/features/bookings/services/__tests__/bookingRules.test.ts`
- [ ] T031 [P] [US2] Add React Native Testing Library tests for validation and preserved form values in `src/features/bookings/components/__tests__/BookingForm.test.tsx`
- [ ] T032 [P] [US2] Add contract tests for create-booking and participant-search operations in `src/test/contract/bookingApi.test.ts`

### Implementation for User Story 2

- [ ] T033 [P] [US2] Implement `Booking.title` required, `Booking.startTime` and `Booking.endTime` ISO-8601 constraints, `Booking.participantIds` employee-directory constraints, and `Booking.status` transitions from data-model.md in `src/features/bookings/types/booking.ts`
- [ ] T034 [P] [US2] Implement Zod schemas for title, date, start/end time, and employee participant identifiers in `src/features/bookings/services/bookingSchema.ts`
- [ ] T035 [P] [US2] Implement booking and employee-directory services for create/list/search operations in `src/features/bookings/services/bookingService.ts` and `src/features/bookings/services/participantService.ts`
- [ ] T036 [US2] Implement TanStack Query mutations and schedule/My Meetings invalidation in `src/features/bookings/hooks/useCreateBooking.ts`
- [ ] T037 [US2] Build the React Hook Form booking form and immediate conflict feedback in `src/features/bookings/components/BookingForm.tsx`
- [ ] T038 [US2] Implement booking form route and modal/stack presentation in `src/app/booking/[roomId].tsx`
- [ ] T039 [US2] Preserve entered form fields across validation and network failures in `src/features/bookings/hooks/useBookingDraft.ts`
- [ ] T040 [US2] Add mock/local create-booking conflict enforcement and mutation success data in `src/shared/api/mockAdapter.ts`
- [ ] T041 [US2] Add conflict, field-error, and retry network state handling to `src/features/bookings/components/BookingForm.tsx`

**Checkpoint**: User Story 2 is independently functional and testable for valid and overlapping booking submissions.

---

## Phase 5: User Story 3 - Manage My Meetings (Priority: P2)

**Goal**: Let employees review upcoming/past meetings and check in or cancel eligible meetings.

**Independent Test**: Switch Upcoming/Past tabs, check in within the allowed window, and cancel a cancellable upcoming meeting.

### Tests for User Story 3 (OPTIONAL - requested by the constitution) ⚠️

- [ ] T042 [P] [US3] Add Jest tests for check-in and cancellation state transitions and time windows in `src/features/bookings/services/__tests__/meetingActions.test.ts`
- [ ] T043 [P] [US3] Add React Native Testing Library tests for Upcoming/Past lists and action confirmations in `src/features/bookings/components/__tests__/MyBookings.test.tsx`
- [ ] T044 [P] [US3] Add contract tests for upcoming/past list, check-in, and cancellation operations in `src/test/contract/myBookingsApi.test.ts`

### Implementation for User Story 3

- [ ] T045 [P] [US3] Implement Upcoming/Past meeting queries with chronological ordering in `src/features/bookings/hooks/useMyBookings.ts`
- [ ] T046 [P] [US3] Implement check-in eligibility and cancellation eligibility rules for `Booking.status` and time windows from data-model.md in `src/features/bookings/services/meetingActions.ts`
- [ ] T047 [P] [US3] Implement check-in and cancellation adapter operations in `src/features/bookings/services/bookingService.ts`
- [ ] T048 [US3] Build the Upcoming/Past segmented meeting list and loading/empty/error states in `src/features/bookings/components/MyBookingsScreen.tsx`
- [ ] T049 [US3] Add check-in and cancellation action controls with confirmation and status feedback in `src/features/bookings/components/MeetingActions.tsx`
- [ ] T050 [US3] Implement the My Bookings Expo Router tab in `src/app/(tabs)/bookings.tsx`
- [ ] T051 [US3] Wire successful check-in/cancellation mutations to refresh room schedules and My Meetings data in `src/features/bookings/hooks/useMeetingActions.ts`

**Checkpoint**: User Story 3 is independently functional and testable for meeting review and eligible actions.

---

## Phase 6: Auth and Profile (Shared Support)

**Purpose**: Complete protected app entry and profile session behavior.

- [ ] T052 [P] Implement login/logout/current-user auth services in `src/features/auth/services/authService.ts`
- [ ] T053 [P] Implement auth state and SecureStore hydration in `src/features/auth/hooks/useAuth.ts`
- [ ] T054 Implement protected route behavior and profile screen in `src/app/(tabs)/profile.tsx` and `src/app/(auth)/login.tsx`
- [ ] T055 [P] Add auth loading/error tests in `src/features/auth/components/__tests__/Profile.test.tsx`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate performance, persistence, accessibility, and full feature behavior.

- [ ] T056 [P] Confirm FlashList compatibility and add FlatList fallback telemetry-free benchmarks in `src/features/rooms/components/RoomList.tsx`
- [ ] T057 [P] Seed complete representative rooms, equipment, employees, and overlapping meetings in `src/shared/storage/seedData.ts`
- [ ] T058 [P] Verify Retry/Error/Empty/Loading states across Rooms, Room Detail, Booking Form, and My Meetings in `src/shared/components/`
- [ ] T059 [P] Add persistence and mock-data reset controls for standalone validation in `src/shared/storage/`
- [ ] T060 Run the quickstart validation scenarios in specs/001-smart-room-booking/quickstart.md
- [ ] T061 Run all Jest and React Native Testing Library suites and fix task-specific failures
- [ ] T062 Review the final implementation against `.specify/memory/constitution.md` and specs/001-smart-room-booking/spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) depends on no project tasks and can begin immediately.
- Foundational (Phase 2) depends on Setup completion and blocks all user stories.
- User Stories (Phases 3-5) depend on Foundational completion; US1 and US2 share P1 priority and US3 follows independently after foundation.
- Auth/Profile (Phase 6) depends on Foundational and may proceed with user stories.
- Polish (Phase 7) depends on all desired user story phases being complete.

### User Story Dependencies

- **User Story 1**: No dependency on US2 or US3; consumes foundational adapter, room types, and date utilities.
- **User Story 2**: Reuses room schedule concepts and foundation rules but is independently testable with a selected room and mock adapter.
- **User Story 3**: Reuses booking domain types and adapter foundation but is independently testable with seeded meetings.

### Within Each User Story

- Tests are written before implementation and must fail before implementation is added.
- Types and pure domain rules before services.
- Services before hooks and mutation/query integration.
- Core UI before route integration.
- Story complete before moving to the next priority.

---

## Parallel Execution Examples

### User Story 1

- T017 RoomSearch tests and T018 RoomTimeline tests can run in parallel.
- T020 Room types, T021 room service, and T022 filter state can run in parallel.
- T024 RoomList and T026 RoomTimeline can run in parallel after their shared types exist.

### User Story 2

- T030 booking-rule tests, T031 form tests, and T032 contract tests can run in parallel.
- T033 booking types, T034 Zod schema, and T035 adapter services can run in parallel.

### User Story 3

- T042 action tests, T043 My Meetings tests, and T044 contract tests can run in parallel.
- T045 meeting queries, T046 action rules, and T047 mutation services can run in parallel.

---

## Implementation Strategy

### MVP First

Complete Phases 1-2, then deliver User Story 1 as the first demonstrable increment. User Story 1 provides
room discovery and timeline selection without requiring booking creation or meeting management.

### Incremental Delivery

1. Setup and Foundation.
2. US1: Search and room timeline.
3. US2: Conflict-free booking creation.
4. US3: Meeting review, check-in, and cancellation.
5. Auth/Profile and final polish.
