# Tasks

Use this document to break down plans into atomic, checklist-style tasks with checkboxes for tracking progress.

## Current Tasks
- [ ] **Phase 35: Dashboard Layout Refinement**
    - [ ] 1. Move Governance and Proposals section inside the `lg:col-span-8` column in `Dashboard.tsx`.
    - [ ] 2. Position "Launch New Proposal" button at the top of the governance column.
    - [ ] 3. Ensure the two-column layout is balanced and eliminates unnecessary whitespace.
- [x] **Phase 34: Dashboard Refactoring**
    - [ ] 1. Enhance Hypercert displays on the dashboard.

## Completed Tasks History
- **Phase 33 (Real Data Integration)**: Connected total balance, active proposals, and 30rd-day activity trends to Supabase data in `TowerDashboard.tsx`.
- **Phase 32 (Global Sidebar)**: Implemented a persistent, collapsible sidebar in `AuthLayout.tsx` and optimized viewport width.
- **Phase 31 (Tower Dashboard Redesign)**: Replaced `BuildingView.tsx` with `TowerDashboard.tsx`, added SVG visualizations, and improved layout.
- **Phase 30 (Proposal Expiration Fix)**: Resolved issue where expired proposals remained active. Implemented `evaluate_cleanup()` RPC and frontend filtering.
- **Phase 29 (Premium Frontend Refinement)**: Reimagined the interface with "Refined Editorial" aesthetic, Frontier OS themes, Bricolage Grotesque typography, and custom motion.
- **Phase 28 (Building Dashboard)**: Created data-rich `BuildingView.tsx` with global/floor stats and `useTowerStats.ts`.
- **Phase 25 (Building View Navigation)**: Interactive tower navigation and multi-floor routing.
- **Phase 24 (Multi-Floor Architecture)**: Multi-tenant system with `floor_id` scoping and RLS safety.
- **Outdated Tasks**: Tinder UI (23), Recurring Expenses (11, 14), Conviction Voting (12), Hypercerts (20, 21), Auth Bypass (19).
