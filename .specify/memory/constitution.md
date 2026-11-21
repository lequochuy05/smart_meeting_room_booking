<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0
- Modified principles:
  - I. Backend-Frontend Separation and Clean Architecture → retained and clarified for the Mobile client
  - II. Transactional Booking Integrity (NON-NEGOTIABLE) → retained
  - III. Conflict and Authorization Test Coverage (NON-NEGOTIABLE) → expanded for mobile Jest and RNTL coverage
  - IV. RESTful API and Documentation Standards → retained
- Added principles:
  - V. Mobile Expo and TypeScript Stack
  - VI. Feature-Based Mobile Architecture
  - VII. Mobile Data and Date-Time Consistency
  - VIII. Mobile Screen State and Form Validation
- Added sections: Mobile Delivery Constraints
- Removed sections: no governance sections removed
- Follow-up TODOs: confirm the original ratification date in TODO(RATIFICATION_DATE)
-->

# Smart Meeting Room Booking Constitution

## Core Principles

### I. Backend-Frontend Separation and Clean Architecture
The system MUST separate the Backend REST API from the Frontend/Mobile clients. The backend MUST
follow Clean Architecture or Layered Architecture principles, with domain, application, and
infrastructure concerns kept in clearly defined boundaries. The API contract and client behavior
MUST remain independently testable, and neither client SHALL bypass server validation or authorization.
Data submitted by clients MUST be validated at the client and revalidated at the server; client
validation is a usability measure and MUST NOT be treated as a security or integrity control.

### II. Transactional Booking Integrity (NON-NEGOTIABLE)
Double-booking MUST be prevented for every room at all times, including concurrent requests.
Booking creation, cancellation, and check-in MUST execute as transactions that preserve all related
state changes atomically. The server MUST enforce room-time conflict checks and transaction isolation
inside the persistence boundary; retry, failure, or rollback MUST NOT leave a partial or conflicting
booking state.

### III. Conflict and Authorization Test Coverage (NON-NEGOTIABLE)
Every implementation of conflict detection, booking overlap calculation, slot availability,
booking-time validation, cancellation rules, check-in rules, and user authorization MUST have
automated Unit Tests. Tests MUST cover concurrent conflict scenarios, boundary times, cancellation
and check-in state transitions, and denied or insufficient privileges. A change that reduces or skips
this coverage MUST NOT be merged.

### IV. RESTful API and Documentation Standards
Source code, variable names, API resource names, and public documentation MUST use clear standard
English. APIs MUST use RESTful resource-oriented paths, HTTP methods, status codes, request and
response schemas, and consistent error responses. Feature specifications and implementation plans
MUST document the scope, rules, interfaces, test strategy, and acceptance criteria clearly enough
for independent implementation and review.

### V. Mobile Expo and TypeScript Stack
The Mobile application MUST use Expo Managed Workflow with React Native and TypeScript strict mode.
Navigation MUST use Expo Router. Local UI state MUST use Zustand. Server state and caching MUST use
TanStack Query. Forms MUST use React Hook Form with Zod schemas for validation. Introducing an
alternative for these responsibilities MUST require an explicit constitution amendment.

### VI. Feature-Based Mobile Architecture
The Mobile application MUST organize product capabilities under `src/features/`, including
`src/features/rooms`, `src/features/bookings`, and `src/features/auth`. Each feature MUST separate UI
components, custom hooks, API services, and domain types into clearly identifiable modules. Feature
code MUST consume shared infrastructure only through stable boundaries and MUST NOT create circular
dependencies between features.

### VII. Mobile Data and Date-Time Consistency
The Mobile client MUST NOT allow a booking to select an overlapping time slot for the same room.
All transmitted and displayed date-time values MUST use a consistent ISO-8601 representation. The
application MUST define and enforce a single timezone normalization and conversion policy, preserve
server-authoritative availability, and revalidate slot availability after network responses or cache
updates.

### VIII. Mobile Screen State and Form Validation
Every data-bearing screen MUST explicitly support loading, empty, and network-error states. Retry
and recovery behavior MUST be visible and actionable without leaving stale or misleading UI state.
Zod MUST validate form input schemas, React Hook Form MUST connect validated fields to submit behavior,
and the Mobile client MUST revalidate domain constraints for room and booking operations before use.

## Technology and Delivery Constraints
The Backend MUST expose a REST API, and the clients MUST consume that API without duplicating
authoritative server rules. Validation, authorization, persistence constraints, and transaction
boundaries MUST be enforced by the server. Client validation SHOULD improve feedback and reduce
avoidable errors but SHALL NOT replace server-side enforcement.

The Mobile application MUST use the technologies named in Principle V and the directory boundaries
named in Principle VI. Replacing a mandated framework or state-management library MUST be justified
by a constitution amendment rather than by a local implementation decision.

## Development and Review Workflow
All changes MUST be reviewed for compliance with this constitution. Specifications and plans MUST
identify affected booking rules, API contracts, authorization behavior, transaction boundaries,
timezone policy, feature boundaries, and required tests before implementation.

Jest and React Native Testing Library MUST test the logic for slot availability and booking-time
validation. Pull requests MUST NOT merge if conflict-detection or authorization tests are missing,
if a booking-related operation lacks transactional integrity, if ISO-8601/timezone behavior is
unverified, or if required Mobile loading, empty, and network-error states are absent.

## Governance
This constitution is the governing project standard for architecture, behavior, quality, and
documentation. Amendments MUST be proposed in writing, record the changed principles or sections,
document the migration impact for existing work, and require repository-owner approval.

Versioning follows Semantic Versioning: a MAJOR version is required for incompatible governance or
principle removals/redefinitions, a MINOR version is required for new or materially expanded principles,
and a PATCH version is required for clarifications or non-semantic refinements. Compliance MUST be
checked during specification review, implementation review, pull-request review, and release readiness
review. Complexity, exceptions, and deviations MUST be explicitly justified and documented.

**Version**: 1.1.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm the original project adoption date | **Last Amended**: 2026-11-21
