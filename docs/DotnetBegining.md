---
title: .NET + Dapper API Architecture
description: The role of each layer in a .NET 9 Web API built with Dapper — Controllers, Services, Repositories, Models, Entities, and Helpers.
tags: [dotnet, dapper, architecture, api, layers]
category: Reference
date: 2026-03-24
---

## Overview

A .NET Web API with Dapper follows a layered architecture where each folder has a single, well-defined responsibility. Dapper maps relational data from the database to C# entity objects used across the application for data management and CRUD operations.

## Layers

### Controllers

Define the endpoints and routes for the Web API. Controllers are the entry point into the application from client applications via HTTP requests. They receive requests, delegate to services, and return responses — nothing more.

### Models

Represent request and response shapes for controller methods.

- **Request models** — define the parameters for incoming requests (body, query string, route params)
- **Response models** — define custom shapes returned when the raw entity isn't suitable

If a route returns an entity directly, a response model may not be needed.

### Services

Contain business logic and validation. Services sit between controllers and repositories — they orchestrate operations, enforce rules, and decide what data gets read or written.

### Repositories

Contain all database access code and SQL queries. Dapper queries live here. Repositories talk directly to the database and return entity objects; they know nothing about business rules.

### Entities

C# classes that map directly to database tables. Dapper deserialises query results into entity instances, which then flow through the repository → service → controller pipeline.

### Helpers

Utility code that doesn't belong in any of the above layers — extension methods, formatters, constants, shared utilities.

---

## Request Flow

```
Client HTTP Request
       │
       ▼
  Controller          ← route definition, auth, input binding
       │
       ▼
   Service            ← business logic, validation
       │
       ▼
  Repository          ← SQL queries via Dapper
       │
       ▼
   Database
```

---

## Quick Rules

- Controllers are **thin** — no business logic, no SQL
- Services are **unaware** of HTTP — they don't touch `HttpContext`
- Repositories are **unaware** of business rules — they just execute queries
- Entities reflect the **database schema** — keep them clean of presentation logic
- Use Models (DTOs) at the **API boundary** to decouple your schema from your contract
