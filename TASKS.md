# Tasks

Use this document to break down plans into atomic, checklist-style tasks with checkboxes for tracking progress.

## Current Tasks
## Current Tasks
- [ ] **Phase 26: Impact Visualization**
    - [ ] 1. Enhance Hypercert displays on the dashboard.
    - [ ] 2. Automate impact reporting notifications for passed proposals.
- [ ] **Phase 27: Governance Refinement**
    - [ ] 1. Implement global vs floor-specific voting power configurations for super_admins.

## Completed Tasks History
- **Phase 25 (Building View Navigation)**: Created `BuildingView.tsx` with interactive tower navigation on `building.png`. Refactored routing to `/floor/:floorId`. Implemented cross-floor read access with "Return to My Floor" navigation aids and floor titles.
- **Phase 24 (Multi-Floor Architecture)**: Transformed the system to multi-tenant. Implemented `floor_id` scoping, `super_admin` role, and resolved RLS infinite recursion issues with `is_super_admin()` and `is_approved()` SQL helpers.
- **Outdated Tasks**: Tinder UI (23), Recurring Expenses (11, 14), Conviction Voting (12), Hypercerts (20, 21), Auth Bypass (19), Fixes (13, 16, 17, 18).
