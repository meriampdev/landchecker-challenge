<!--
Sync Impact Report (review scratch; remove before committing this constitution)
Version change: unratified scaffold → 1.0.0 (initial adoption)
Modified principles: five unfilled slots replaced with:
  I. Independent Application Boundaries
  II. Frontend Feature Locality
  III. Rails Conventions and Explicit Responsibilities
  IV. Server-Side Integrity and Usable States
  V. Proportionate Quality and Honest Verification
Added sections: Delivery Requirements; Development and Review Workflow; Governance rules
Removed sections: none (scaffold placeholders and illustrative comments replaced)
Follow-up TODOs: none
-->
# Landchecker Challenge Constitution

## Core Principles

### I. Independent Application Boundaries

- The project MUST use separate `frontend/` and `backend/` folders in one root Git repository.
- Each application MUST own its dependencies, configuration, Dockerfile, and tests.
- Root files MUST coordinate Docker Compose and documentation. Application implementation and
  application-specific configuration MUST remain within their application.

These boundaries keep each application understandable while providing one reviewer entry point.

### II. Frontend Feature Locality

- Frontend code MUST be organized by feature: `auth`, `properties`, and `watchlist`.
- Substantial components MUST have their own folders. Component styles, tests, and private
  helpers and types MUST be colocated with the component.
- Feature-specific hooks, API functions, types, and utilities MUST remain within their feature.
- Code MUST enter `shared/` only when it is actually reused across features.
- Cross-feature imports MUST be limited to necessary integration through deliberate public
  interfaces. Features MUST NOT reach into another feature's private implementation.
- Files MUST be split by responsibility when doing so improves readability. Abstractions and
  folder structures MUST NOT be introduced solely for anticipated future reuse.

Locality keeps related changes easy to follow within the assessment time budget.

### III. Rails Conventions and Explicit Responsibilities

- The backend MUST preserve Rails naming, autoloading, and folder conventions.
- Controllers MUST focus on request handling and response orchestration, with authorization
  explicit at the request boundary.
- Models MUST own validations and associations.
- Substantial search logic MUST be extracted into a feature-namespaced query object using
  Rails-compatible naming and paths.
- Services MUST be introduced only when a workflow warrants orchestration beyond existing
  controllers, models, or query objects. Trivial delegation does not warrant a service.
- Backend tests in `spec/` MUST mirror the organization of the source they exercise.

Conventional responsibilities make the backend easier to inspect without custom architecture.

### IV. Server-Side Integrity and Usable States

- The server MUST validate inputs and enforce ownership for protected reads and mutations.
  Client-side checks MUST NOT substitute for server-side enforcement.
- Key invariants MUST be backed by database constraints, including applicable non-null,
  foreign-key, and uniqueness constraints alongside model validations.
- Data access MUST avoid N+1 queries through appropriate loading and query design.
- The frontend MUST provide clear loading, error, empty, and mutation states for applicable
  flows. Mutations MUST communicate progress and success or failure without ambiguous feedback.

Correctness includes both stored data integrity and understandable user feedback.

### V. Proportionate Quality and Honest Verification

- Engineering effort MUST fit a 3–4 hour fullstack assessment. Prioritize working critical
  flows, security boundaries, and straightforward implementation over speculative architecture.
- Tests MUST cover critical user flows and authorization boundaries, including rejected
  unauthenticated or unauthorized access where applicable. A coverage percentage or exhaustive
  test suite is not required.
- Comments MUST explain non-obvious decisions or constraints rather than restate obvious code.
- Refactors MUST stay focused and preserve existing behavior, verified with checks appropriate
  to the affected flow.
- Test and build results MUST be reported truthfully. A passing result MUST only be claimed
  after the corresponding command has executed successfully. Skipped, failed, or blocked
  checks MUST be identified as such.

## Delivery Requirements

- Docker Compose MUST be the primary startup method. Reviewers MUST need only Docker and Git
  installed on the host, with no host application runtime or package manager prerequisites.
- Root documentation MUST provide startup commands and required setup, demo credentials, and
  commands for running each application's tests through Docker Compose.
- Documentation MUST explain how to demonstrate real-time behavior, including required sessions
  or browser windows, the triggering action, and the expected visible update.
- Setup and demo data instructions MUST allow a reviewer to reproduce the documented
  demonstration from a fresh checkout.

## Development and Review Workflow

- Plans and tasks MUST respect application boundaries and feature locality while remaining
  achievable within the assessment time budget.
- Changes MUST remain scoped to the requested behavior. Additional layers, dependencies, and
  abstractions MUST have a concrete need in the implemented flows.
- Before delivery, review affected code for input validation, ownership checks, database
  invariants, query loading, and user feedback states as applicable.
- Execute relevant tests and build checks that are feasible for the change, and record the
  commands and outcomes. Remaining verification gaps MUST be disclosed to the reviewer.
- Review delivery documentation against the actual Compose setup and demonstration behavior.
  Unimplemented or unverified behavior MUST NOT be described as working.

## Governance

This constitution governs project specifications, plans, tasks, implementation, and review.
Compliance MUST be checked when planning and before delivery using the workflow above. No
separate approval ceremony or additional tooling is required for this assessment.

Amendments MUST update this document, explain the reason and impact in a Sync Impact Report,
and update the version and last-amended date. Review affected plans or tasks for consistency.
Exceptions MUST be recorded with a concrete reason and impact. A change that redefines a rule
MUST amend the constitution rather than silently bypass it.

Versions follow semantic versioning: MAJOR for incompatible principle removals or redefinitions,
MINOR for new principles or materially expanded guidance, and PATCH for clarifications that do
not change requirements. Preserve the original ratification date across amendments.

**Version**: 1.0.0 | **Ratified**: 2026-11-25 | **Last Amended**: 2026-11-25
