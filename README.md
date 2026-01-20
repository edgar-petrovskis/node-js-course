## Architecture structure description

This is a **NestJS** project built on SOLID and Clean Architecture principles. The structure is organized into modules(UsersModule), where each module incapsulates its own logic and consists of next levels:

1. Controller - handles HTTP requests
2. Service - contains business logic
3. DTO - place where validation is described
4. Entities - place where models are described

This approach allows code be predictable and scalable

## Why?

In case of project growth it is easy to expand codebase without pain due its scalability via SOLID principles (each file has its purpose.)

**NestJS** provides a way to inject dependencies without direct initialization via `new ConfigModule()`. By doing this it reduces coupling between modules, provides testability. The implementation could be easily replaced by another without major codebase changes.

## Developer Experience

The project uses **Yarn** as package manager.

Quick start:

```bash
yarn install          # install dependencies
yarn run start:dev    # run with hot-reload
```
