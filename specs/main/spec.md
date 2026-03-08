# Feature Spec: Data Isolation and Clean Slate for New Users

## Problem Description

1. **Initial State Leak**: Newly created users are populated with tasks upon registration. These might be leftover default tasks or tasks from an administrative "Inbox" that are being incorrectly shared or duplicated.
2. **Horizontal Privilege Escalation**: Collaborators and other non-admin users can see all projects and tasks, including those belonging to the administrator. This indicates a failure in Row Level Security (RLS) enforcement or incorrect query filtering in the application layer.

## Requirements

- **Strict Isolation**: A user MUST ONLY see projects where they are the `owner_id` or an explicit member in `project_members`.
- **Task Privacy**: A user MUST ONLY see tasks within projects they have access to, OR tasks they created, OR tasks specifically assigned to them.
- **Empty Start**: New users should NOT have any tasks assigned or created for them automatically, unless they are the system's "Inbox" (if required/desired, though the user explicitly stated they should be empty).

## Proposed Changes

### Database (RLS Enforcement)

- Explicitly enable RLS on `profiles`, `projects`, `sections`, `tasks`, and `project_members`.
- Audit and reinforce policies to ensure `collaborator` roles cannot bypass owner/member checks.

### Application Layer

- Ensure the registration flow does not trigger any "welcome tasks" or "sample projects" logic if that is the source of the initial tasks.

## Verification Plan

### Manual Verification

1. Create a new user and verify that the Inbox/Task list is empty.
2. Log in as a collaborator and verify that admin-owned projects (not assigned to them) are invisible.
3. Try to access a task ID belonging to another user via API and verify it returns a 404 or empty result.
