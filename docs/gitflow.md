# Git Flow

## Branch Model

This repository uses a minimal three-branch strategy:

- `feature/*` for task-focused development branches
- `develop` as the integration branch and stage source branch
- `main` as the production branch

## Change Flow

All new work starts from a `feature/*` branch.

Changes move through the repository in this order:

1. `feature/* -> develop` via pull request
2. `develop -> main` via pull request

## Branch Responsibilities

### `feature/*`

- Used for isolated implementation work
- Short-lived branches
- Merged only through pull requests

### `develop`

- Shared integration branch
- Source branch for stage deployments
- Must remain deployable to the stage environment

### `main`

- Stable production branch
- Source branch for production deployments
- Must contain only reviewed and verified changes
