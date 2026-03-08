# Research: Security and User Isolation Issues

## 🛑 Critical Findings

### 1. Default Admin Privilege

- **Finding**: In `migration_collaborator_role.sql` (Line 13), the `profiles.role` column is added with `DEFAULT 'admin'`.
- **Result**: Every new user starts with full administrative access to all projects and tasks until (and if) the backend updates them to 'collaborator'.

### 2. Privilege Escalation Vulnerability

- **Finding**: In `schema.sql` (Lines 73-75), users can update their own profile without restrictions on which columns.
- **Result**: Any user can escalate their role to 'admin' by sending an update request to the `profiles` table.

### 3. Automatic Task Creation (Initial State)

- **Finding**: While a migration exists to remove the 'Inbox' trigger, if the user is still seeing tasks, it's likely they are seeing the _Administrator's_ tasks because they are being created as 'admin' by default.

## Proposed Strategy

1. **Fix Default Role**: Change `DEFAULT 'admin'` to `DEFAULT 'collaborator'`.
2. **Secure Roles**:
   - Prevent users from updating the `role` column in `profiles` (RLS should only allow `admin` to change roles).
   - Alternatively, use a separate `roles` table or handled via a secure function.
3. **Audit Queries**: Move logic like `(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'` into a `security definer` function to prevent recursion and ensure accuracy.

## Needs Clarification

- [x] Are new users seeing admin tasks? **YES**, because they are likely being created as `admin`.
- [ ] Has `migration_remove_auto_inbox.sql` been executed on the production DB?
