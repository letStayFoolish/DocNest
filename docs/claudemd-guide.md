---
title: CLAUDE.md Quick Reference & Template
description: Checklist, full .NET template, and rules for what to include (and avoid) in a CLAUDE.md file.
tags: [claude, ai, dotnet, workflow, best-practices]
category: Claude
date: 2026-03-24
---

## Pre-Commit Checklist

Before committing your `CLAUDE.md`, verify:

- [ ] Tech stack with specific versions listed
- [ ] Project structure with folder purposes
- [ ] Build, test, and run commands
- [ ] Architecture philosophy (why, not just what)
- [ ] Naming conventions for your patterns
- [ ] Patterns you use **and** patterns you avoid
- [ ] Git workflow and branch naming
- [ ] Domain terminology mapped to code
- [ ] No secrets, credentials, or connection strings
- [ ] Under 300 lines (use imports for details)
- [ ] Tested with a real prompt to verify effectiveness

---

## The Complete .NET CLAUDE.md Template

```markdown
# CLAUDE.md - [Project Name]

## Overview
[One-sentence description of what this project does]

## Tech Stack
- .NET 10, ASP.NET Core Minimal APIs
- Entity Framework Core 10 with PostgreSQL
- Mediator for CQRS (source-generated, https://github.com/martinothamar/Mediator)
- FluentValidation for request validation
- Scalar for OpenAPI documentation
- xUnit + FluentAssertions for testing

## Project Structure
- `src/Api/`            - Endpoints, middleware, DI configuration
- `src/Application/`   - Commands, queries, handlers, validators
- `src/Domain/`        - Entities, value objects, enums, domain events
- `src/Infrastructure/`- EF Core, external services, repositories
- `tests/UnitTests/`   - Domain and application layer tests
- `tests/IntegrationTests/` - API and database tests

## Commands
- Build:           `dotnet build`
- Test:            `dotnet test`
- Run API:         `dotnet run --project src/Api`
- Add Migration:   `dotnet ef migrations add <Name> -p src/Infrastructure -s src/Api`
- Update Database: `dotnet ef database update -p src/Infrastructure -s src/Api`
- Format:          `dotnet format`

## Architecture Rules
- Domain layer has ZERO external dependencies
- Application layer defines interfaces, Infrastructure implements them
- All database access goes through EF Core DbContext (no repository pattern)
- Use Mediator for all command/query handling
- API layer is thin — endpoint definitions only

## Code Conventions

### Naming
- Commands:  `Create[Entity]Command`, `Update[Entity]Command`
- Queries:   `Get[Entity]Query`, `List[Entities]Query`
- Handlers:  `[Command/Query]Handler`
- DTOs:      `[Entity]Dto`, `Create[Entity]Request`

### Patterns We Use
- Primary constructors for DI
- Records for DTOs and commands
- Result<T> pattern for error handling (no exceptions for flow control)
- File-scoped namespaces
- Always pass CancellationToken to async methods

### Patterns We DON'T Use (Never Suggest)
- Repository pattern (use EF Core directly)
- AutoMapper (write explicit mappings)
- Exceptions for business logic errors
- Stored procedures

## Validation
- All request validation in FluentValidation validators
- Validators auto-registered via assembly scanning
- Validation runs in Mediator pipeline behavior

## Testing
- Unit tests: Domain logic and handlers
- Integration tests: Full API endpoint testing with WebApplicationFactory
- Use FluentAssertions for readable assertions
- Test naming: `[Method]_[Scenario]_[ExpectedResult]`

## Git Workflow
- Branch naming: `feature/`, `bugfix/`, `hotfix/`
- Commit format: `type: description` (feat, fix, refactor, test, docs)
- Always create a branch before changes
- Run tests before committing

## Domain Terms
- [Term 1] - [Maps to Entity/Concept]
- [Term 2] - [Maps to Entity/Concept]
```

---

## What to Include

| Include | Why |
| --- | --- |
| Tech stack with versions | Be specific: "EF Core 10" not just "EF Core" |
| Project structure | Map folders to their purpose |
| Common commands | Build, test, run, migrations |
| Coding conventions | Naming, patterns, style preferences |
| Patterns you use | Mediator, Result pattern, CQRS |
| Patterns you DON'T use | Equally important — prevents unwanted suggestions |
| Domain terminology | Business terms that map to code entities |
| Testing instructions | Frameworks, how to run, naming conventions |
| Repository workflow | Branch naming, commit format, PR process |

## What NOT to Include

| Avoid | Reason |
| --- | --- |
| Secrets or credentials | Never — API keys, connection strings, passwords |
| Rules linters already handle | Use Prettier / ESLint / `dotnet format` instead |
| Obvious framework knowledge | Claude already knows how ASP.NET Core works |
| Excessive documentation | Link to docs instead of copying content |
| Historical context | Focus on current state, not project history |

> Every word in `CLAUDE.md` consumes context tokens. Keep it under **300 lines**.
> Ideally aim for **50–100 lines** in the root file with `@import` directives for detailed sections.
