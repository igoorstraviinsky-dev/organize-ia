# Tasks: Security and Isolation Fixes

## Phase 2: Implementation

- [x] Create SQL migration script `final_security_fix.sql` <!-- id: 100 -->
- [/] Apply SQL migration to Supabase <!-- id: 101 -->
- [ ] Drop all "auto-task" triggers (Included in SQL script) <!-- id: 102 -->

## Phase 3: Verification

- [ ] Verify default role is 'collaborator' for new users <!-- id: 103 -->
- [ ] Verify role change restriction (escalation prevention) <!-- id: 104 -->
- [ ] Verify data isolation (collaborator cannot see admin tasks) <!-- id: 105 -->
- [ ] Verify empty initial state (no auto-inbox tasks) <!-- id: 106 -->
