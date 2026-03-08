# Data Model: Security and Isolation Fixes

## 1. Profiles Table (`profiles`)

- **Action**: Modify `role` column to have `DEFAULT 'collaborator'`.
- **Constraint**: Users should NOT be able to update their own `role` column.
- **Policies**:
  - `SELECT`: Own profile only.
  - `UPDATE`: Own profile, but only specific columns (full_name, avatar_url, phone). `role` must be protected.

## 2. Projects Table (`projects`)

- **RLS**: Enabled.
- **Policies**:
  - `SELECT`:
    - Admins see all.
    - Owners see own.
    - Members see assigned (via `project_members`).

## 3. Tasks Table (`tasks`)

- **RLS**: Enabled.
- **Policies**:
  - `SELECT`:
    - Admins see all.
    - Creators see own.
    - Assignees see assigned.
    - Project members see all tasks in their assigned projects.

## 4. Project Members (`project_members`)

- **RLS**: Enabled.
- **Policies**:
  - `SELECT`:
    - Admins see all.
    - Users see their own membership.
    - Project owners see members of their projects.
