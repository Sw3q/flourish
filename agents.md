# Flourish Fund - Developer Guidelines & Rules

## Project Description
The Flourish Fund is a web application designed to manage the communal pot for the "Human Flourishing Floor" of the frontier tower. Each floor member contributes to a communal fund, and the application serves as a mechanism to gather grassroots consensus on how to spend those funds.

## Tech Stack
*   **Frontend**: React, Vite, TypeScript
*   **Styling**: Tailwind CSS (customized with a playful, vibrant, glassmorphic UI approach).
*   **Backend / DB**: Supabase (Postgres, Auth, Edge Functions)

## Core Mechanisms
1.  **Strict Authentication & Manual Verification**: Members can sign up, but their accounts must be manually verified and approved by an Admin user before they can view or propose any spending.
2.  **Semi-structured Proposals**: Funding requests must fall into pre-defined categories set by the Admin.
3.  **Liquid Democracy**: Users can manually vote (Yes/No) on active proposals OR delegate their voting power to another trusted member. Voting power is dynamically aggregated.
4.  **Threshold Passage**: A proposal passes immediately if it secures >50% of the entire Floor's voting power block.
5.  **Virtual Funds**: Fund tracking is completely virtual and entered manually by the admin. There is no Stripe/bank integration.

## Operating Rules
1.  **Test-Driven Culture**: As of Phase 8+, unit tests MUST be written to accompany all logic changes, components, and regressions. Test cases must be designed BEFORE jumping into the code edits.
2.  **Premium Aesthetics**: UI components must utilize the `primary` and `accent` gradient mappings setup in `index.css`, and not use basic colors. Maintain a highly dynamic, smooth, interactive, glassmorphic aesthetic on all components.
3.  **Continuous Evaluation**: Always write tests for critical regression points. For example, authentication boundaries or vote weighting logic.
4.  **Artifact Alignment**: The `task.md` and `implementation_plan.md` must be kept rigidly up to date as project phases evolve.
