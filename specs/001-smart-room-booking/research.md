# Research: Smart Room Booking

## Decision: Expo Managed Workflow

**Decision**: Use Expo Managed Workflow with React Native and strict TypeScript.
**Rationale**: It matches the project constitution and provides a consistent mobile build and test workflow.
**Alternatives considered**: Bare React Native was rejected because it adds native configuration overhead without a feature requirement benefit.

## Decision: Expo Router for Navigation

**Decision**: Use Expo Router with a tabs layout for Rooms, My Bookings, and Profile, plus stack or modal screens for room detail and booking form.
**Rationale**: File-based routing provides direct screen ownership, deep-linkable routes, and clear feature boundaries.
**Alternatives considered**: React Navigation was viable but would duplicate routing configuration already provided by Expo Router.

## Decision: Zustand and TanStack Query

**Decision**: Use Zustand for local UI state and TanStack Query for server state, caching, invalidation, loading, and error states.
**Rationale**: This separates transient UI filters and selected values from remote data lifecycle state.
**Alternatives considered**: A single global store or Redux was rejected because it would mix server cache concerns with local interaction state.

## Decision: Axios API Client with Interceptors

**Decision**: Use a configured Axios client with authentication, request, response, and error interceptors. Use an adapter abstraction behind feature API services.
**Rationale**: Interceptors provide consistent session and network handling, while the adapter abstraction allows JSON Server or local persistence without feature changes.
**Alternatives considered**: Direct fetch calls were rejected because they provide less shared configuration and error normalization.

## Decision: Standalone Data Adapter

**Decision**: Ship JSON Server or a local storage adapter backed by AsyncStorage or Expo SQLite. AsyncStorage is sufficient for a small sample dataset; Expo SQLite is preferred if concurrent/transactional local mutations are needed.
**Rationale**: A runtime-selectable mock/local adapter lets the app run before backend integration and keeps feature hooks independent of transport.
**Alternatives considered**: AsyncStorage-only was retained as the portable default; SQLite is the upgrade path for robust local concurrency testing.

## Decision: Secure Session Storage

**Decision**: Store authenticated session credentials in Expo SecureStore, never in ordinary application state or AsyncStorage.
**Rationale**: SecureStore is the platform-provided protected storage mechanism supported by Expo Managed Workflow.
**Alternatives considered**: AsyncStorage was rejected because it is not designed for sensitive session secrets.

## Decision: Timeline Selection Component

**Decision**: Render the room timeline using a bounded vertical or horizontal time grid with fixed 30-minute slots and memoized overlap states.
**Rationale**: Fixed slots make validation and visual availability straightforward while meeting the overlap rules in the specification.
**Alternatives considered**: Free-form continuous dragging was rejected for the initial product because it increases input ambiguity and testing cost.

## Decision: Efficient Room Lists

**Decision**: Use FlashList when its runtime constraints are supported, with FlatList as the fallback.
**Rationale**: Both support recycling and virtualization; FlashList improves complex-card rendering, while FlatList remains broadly compatible.
**Alternatives considered**: Rendering all room cards in a scroll view was rejected because it does not scale as the room list grows.

## Decision: Company-Wide Timezone and ISO-8601

**Decision**: Store and transmit unambiguous ISO-8601 values with timezone offsets and display all values in the configured company timezone.
**Rationale**: This satisfies cross-device consistency and prevents device timezone settings from changing meeting meaning.
**Alternatives considered**: Local device timezone display was rejected because the clarified specification requires a company-wide timezone.

## Decision: Participant Source

**Decision**: Validate and resolve participants through an employee-directory-backed data source. External guests are excluded from the initial scope.
**Rationale**: This follows the clarification and keeps participant identity consistent.
**Alternatives considered**: Free-form email entries were rejected because they permit unverified external participants.
