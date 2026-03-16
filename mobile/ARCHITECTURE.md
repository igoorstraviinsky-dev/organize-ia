# Mobile architecture

## Current direction

The mobile app now follows a lightweight Expo Router structure:

- `app/`: navigation and route entrypoints
- `src/components/`: reusable UI blocks
- `src/config/`: runtime app configuration
- `src/hooks/`: cross-screen behavior such as auth session and realtime sync
- `src/lib/`: client setup for external services
- `src/services/`: data access and business-oriented queries
- `src/types/`: shared domain models

## Recommended next steps

1. Move each route's large local styles into screen-level files under `src/features/<feature>/screens`.
2. Extract repeated gradients, headers, buttons, and empty states into design-system components.
3. Add a query/cache layer (`@tanstack/react-query`) before expanding offline behavior.
4. Replace `any` in the remaining screens/components and wire typed Supabase generated types if available.
5. Move auth, tasks, and projects into feature folders when the app grows beyond the current core flows.
