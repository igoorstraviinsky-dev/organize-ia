# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The objective is to ensure strict data isolation between users and a clean initial state for new accounts. This involves fixing a critical vulnerability where new users are granted `admin` privileges by default and can escalate their own roles. We will also finalize the removal of automatic "Inbox" creation to ensure a truly empty start.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: JavaScript (Node.js), SQL (PostgreSQL/Supabase)
**Primary Dependencies**: Supabase RLS, Express.js
**Storage**: PostgreSQL (Supabase)
**Testing**: Manual validation via registration and role switching
**Target Platform**: Web (Supabase)
**Project Type**: Web Service / Database Fix
**Performance Goals**: N/A
**Constraints**: Zero-trust access model
**Scale/Scope**: All current and future users

## Phases

### Phase 0: Outline & Research

- [x] Audit database for default roles and RLS gaps.
- [x] Document vulnerabilities in `research.md`.
- [x] Clarify source of "auto-tasks" (likely due to global visibility as admin).

### Phase 1: Design & Contracts

- [x] Define RLS policies in `data-model.md`.
- [ ] Create `quickstart.md` for security deployment.
- [ ] Update `plan.md` tasks below.

### Phase 2: Implementation

- **Step 1**: SQL migration to change default role in `profiles`.
- **Step 2**: SQL migration to harden RLS on `profiles`.
- **Step 3**: SQL migration to enforce project-based isolation on `tasks` and `projects`.
- **Step 4**: Drop all "auto-task" triggers if found.

## Project Structure

```text
specs/main/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
└── tasks.md (to be generated)
```

## Verification Plan

### Automated/Manual Tests

- [ ] **Registration**: Register a new user -> verify role is 'collaborator' via SQL or Admin dashboard.
- [ ] **Escalation**: Try to update role to 'admin' via frontend/API -> verify it fails.
- [ ] **Visibility**: Login as collaborator -> verify admin tasks are NOT returned.
- [ ] **Inbox**: Verify new user starts with 0 tasks.
