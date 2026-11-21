# Implementation Plan: Smart Room Booking

**Branch**: `001-smart-room-booking` | **Date**: 2026-11-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-smart-room-booking/spec.md`

## Summary

Build a mobile-first meeting-room workflow for employees to discover rooms, filter availability,
inspect daily timelines, create conflict-free bookings, and manage upcoming or past meetings.
The implementation uses Expo Router, strict TypeScript, feature-based modules, TanStack Query for
server state, Zustand for local UI state, and React Hook Form with Zod for booking forms. A clean
Axios adapter boundary will support a real API or standalone JSON Server/local-persistence mode.

## Technical Context

**Language/Version**: TypeScript strict mode with React Native and Expo Managed Workflow

**Primary Dependencies**: Expo Router, Axios, TanStack Query, Zustand, React Hook Form, Zod,
Expo SecureStore, AsyncStorage or Expo SQLite, Jest, React Native Testing Library

**Storage**: Expo SecureStore for session information; AsyncStorage or Expo SQLite for standalone
mock data and cached local state

**Testing**: Jest and React Native Testing Library for slot availability, booking-time validation,
forms, timeline behavior, loading/empty/error states, check-in, and cancellation

**Target Platform**: Android and iOS through Expo

**Project Type**: Mobile application

**Performance Goals**: Room lists remain responsive for the expected sample and small enterprise room
catalog; UI interactions must provide immediate local conflict feedback

**Constraints**: All availability and booking mutations must be revalidated by the authoritative
adapter/server; ISO-8601 date-times and the company timezone must remain consistent; every data
screen requires loading, empty, and network-error states

**Scale/Scope**: Employee-facing room search, daily room timeline, booking creation, upcoming/past
meeting management, and profile session state

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS: Mobile and backend concerns remain separated through a transport-independent API adapter.
- PASS: The feature layout will use `src/features/rooms`, `src/features/bookings`, and
  `src/features/auth`, with UI, hooks, services, and domain types separated.
- PASS: Double-booking is addressed by local preview rules and authoritative adapter/server
  revalidation at submission.
- PASS: Check-in, cancellation, and booking mutations preserve clear success/failure states.
- PASS: Jest and React Native Testing Library cover overlap, time validation, authorization-relevant
  behavior, and screen states.
- PASS: SecureStore is reserved for session credentials; ordinary UI and server state use Zustand,
  TanStack Query, or the local persistence adapter.
- PASS: Loading, empty, and retryable network-error states are required across data screens.
- PASS: All date-time values use ISO-8601 and the company-wide display timezone.

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-room-booking/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mobile-api.md
└── spec.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (tabs)/
│   │   ├── rooms.tsx
│   │   ├── bookings.tsx
│   │   └── profile.tsx
│   ├── room/[roomId].tsx
│   └── booking/[roomId].tsx
├── features/
│   ├── rooms/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── bookings/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   └── auth/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── shared/
│   ├── api/
│   ├── components/
│   ├── storage/
│   └── utils/
└── test/
    ├── unit/
    └── mocks/
```

**Structure Decision**: The selected structure is a feature-based Expo mobile application. Expo Router
owns route entry points, while reusable domain behavior remains inside feature folders. Shared code
contains only transport, storage, UI primitives, and date/time utilities.

## Architecture and Data Flow

### API Client

- Define an Axios instance with base URL, timeout, JSON headers, and normalized error transformation.
- Request interceptor attaches a SecureStore-backed session token without exposing session secrets to UI
  modules.
- Response interceptor normalizes adapter/network errors and invalidates or refreshes session state when
  authentication is rejected.
- Feature services depend on an adapter interface, not directly on UI or storage implementations.
- Runtime configuration selects a real HTTP adapter or a mock/local adapter; mock and real adapters
  implement identical operations and normalized errors.

### Server and Local State

- TanStack Query owns rooms, schedules, employee search, and meeting lists.
- Zustand owns only local UI concerns such as filters, selected slot, form progress, and session UI state.
- Booking mutations invalidate affected room schedules and My Meetings queries only after confirmed success.
- Cached data may improve perceived responsiveness but cannot authorize a booking submission.

### Standalone Adapter

- Seed rooms, equipment, employees, and bookings through JSON Server or a local storage initialization step.
- AsyncStorage is the default small-dataset store; Expo SQLite is used if concurrency and transactional
  local mutations are required.
- Local mutations must reject overlap conflicts, preserve ISO-8601 values, and support check-in/cancellation
  state transitions.
- The standalone adapter must implement loading and injected-failure modes to exercise error states.

### Timeline and Lists

- Timeline uses fixed 30-minute slots with a memoized set of booked and available slots.
- Selecting a slot opens or pre-fills booking entry and immediately recalculates overlap status.
- Room lists use FlashList and a FlatList fallback after dependency/compatibility validation.
- Filtered lists, timeline data, and selected slot values use stable identifiers and memoized selectors.

### Authentication and Forms

- Login session tokens are stored in Expo SecureStore.
- Logout clears protected session storage and resets authenticated TanStack Query state.
- Zod schemas validate meeting title, date, time range, and employee participant identifiers.
- React Hook Form preserves submitted fields across validation and network errors.

## Validation Strategy

- Unit-test pure overlap and time-range functions for adjacent boundaries, concurrent conflict attempts,
  invalid ranges, past times, and timezone normalization.
- Unit-test Zod schemas and check-in/cancellation eligibility windows.
- Use React Native Testing Library for room search, timeline, booking form, My Meetings, and state screens.
- Verify standalone adapter behavior by creating a booking, reopening the app, and confirming persisted
  state and authoritative conflict prevention.

## Complexity Tracking

No constitution violations require complexity exceptions.
