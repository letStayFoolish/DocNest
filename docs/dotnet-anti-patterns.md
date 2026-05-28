---
title: "10 .NET 10 API Anti-Patterns That Break Production"
description: "Not all anti-patterns are equal — some crash production at 2 AM, others slow your sprint by 5%. A severity-ranked guide to the ten most dangerous .NET 10 API mistakes and how to fix them."
tags:
  - dotnet
  - csharp
  - api
  - performance
  - architecture
category: "Dotnet"
date: "2026-05-28"
---

# 10 .NET 10 API Anti-Patterns That Break Production

> Most "anti-pattern" lists treat every bad practice the same. That is wrong.
> Some crash production at 2 AM — others just slow your sprint by 5%.
> **Fix the red ones first. Always.**

---

## Severity Matrix

| # | Anti-Pattern | Severity | Fix Now? |
|---|---|---|---|
| 1 | `async void` outside event handlers | 🔴 Kills production | **Yes** |
| 2 | `.Result` / `.Wait()` (sync-over-async) | 🔴 Kills production | **Yes** |
| 3 | `new HttpClient()` per request | 🔴 Kills production | **Yes** |
| 4 | `throw ex` instead of `throw` | ⚪ Cosmetic | When you see it |
| 5 | Fat controllers | 🟡 Slows velocity | Next sprint |
| 6 | Repository pattern over DbContext for CRUD | 🟡 Slows velocity | Next sprint |
| 7 | `IEnumerable<T>` from async actions | 🟠 Costs money | This sprint |
| 8 | Singleton injecting Scoped (captive dependency) | 🔴 Kills production | **Yes** |
| 9 | Runtime-reflection mapper in AOT | 🟠 Costs money | Before AOT publish |
| 10 | Panic-paying for commercial libraries | 🟠 Costs money | Before procurement |

---

## #1 — `async void` Outside Event Handlers
**Severity: 🔴 Kills production**

Exceptions thrown inside `async void` cannot be caught by the caller. They propagate as `AppDomain.UnhandledException` and **terminate the process**.

```csharp
// ❌ Bad — crashes the host on any exception
static async void SendConfirmationEmailAsync(string email) { ... }

// ✅ Fix — exception is captured on the Task, logged, process lives
_ = Task.Run(async () =>
{
    try { await SendConfirmationEmailAsync(email); }
    catch (Exception ex) { log.LogError(ex, "Email failed"); }
});

static async Task SendConfirmationEmailAsync(string email) { ... }
```

> **Rule:** `async void` is only valid in UI event handlers. Everywhere else: `async Task`.

---

## #2 — `.Result` / `.Wait()` (Sync-Over-Async)
**Severity: 🔴 Kills production**

Blocks a thread pool worker waiting on a Task that needs another thread pool worker to complete. Under load (~50–100 concurrent requests) this causes **thread pool starvation** — requests time out, the app falls off a cliff.

```csharp
// ❌ Bad — blocks thread, starves pool under load
var product = products.GetByIdAsync(id).Result;

// ✅ Fix — async all the way down
var product = await products.GetByIdAsync(id);
```

> All ASP.NET Core surfaces (Minimal APIs, MVC actions, middleware) support `async` natively. There is no valid excuse for `.Result` in a handler.

---

## #3 — `new HttpClient()` Per Request
**Severity: 🔴 Kills production**

`Dispose()` does not close the socket immediately — it enters `TIME_WAIT` for 240 s. Under sustained load you exhaust ephemeral ports → `SocketException`.

```csharp
// ❌ Bad — socket exhaustion under load
using var http = new HttpClient();
var response = await http.GetStringAsync(...);

// ✅ Fix — IHttpClientFactory pools handlers, rotates DNS
builder.Services.AddHttpClient("weather", c =>
    c.BaseAddress = new Uri("https://api.example.com"));

app.MapGet("/weather/{city}", async (string city, IHttpClientFactory factory) =>
{
    var http = factory.CreateClient("weather");
    return Results.Content(await http.GetStringAsync($"/weather/{city}"), "application/json");
});
```

---

## #4 — `throw ex` Instead of `throw`
**Severity: ⚪ Cosmetic (debugging cost)**

`throw ex` resets the stack trace to the rethrow line. The original origin is lost. You spend an hour reading source code because the log lies.

```csharp
// ❌ Bad — stack trace points to THIS line, not the actual origin
catch (DbUpdateException ex) { _logger.LogError(ex, "Save failed"); throw ex; }

// ✅ Fix — preserves original stack trace
catch (DbUpdateException ex) { _logger.LogError(ex, "Save failed"); throw; }
```

---

## #5 — Fat Controllers / Fat Handlers
**Severity: 🟡 Slows velocity**

Validation + DB access + email send + audit log in one 200-line method. Not broken, but three engineers cannot touch it in parallel without merge conflicts, and every new requirement adds another `await`.

```csharp
// ❌ Bad — one handler owns everything
app.MapPost("/orders", async (CreateOrderRequest req, AppDbContext db,
    IEmailService email, IAuditLog audit, ILogger<Program> log) => { ... });

// ✅ Fix — handler owns only HTTP-to-domain translation
app.MapPost("/orders", async (CreateOrderRequest req, IDispatcher dispatcher) =>
{
    var result = await dispatcher.Send(new CreateOrderCommand(req));
    return result.IsSuccess
        ? Results.Created($"/orders/{result.Value.Id}", result.Value)
        : Results.BadRequest(result.Error);
});
```

> Validation → validator. Business logic → command handler. Emails → integration event / background queue.

---

## #6 — Repository Pattern Over DbContext for Trivial CRUD
**Severity: 🟡 Slows velocity**

In EF Core 10, `DbContext` is already a Unit of Work and `DbSet<T>` is already a repository. Wrapping it adds two files and zero value.

```csharp
// ❌ Bad — interface + implementation that just delegates to DbContext
public interface IProductRepository { Task<Product?> GetByIdAsync(int id, CancellationToken ct); ... }

// ✅ Fix — use DbContext directly in your handler
public sealed class CreateProductHandler(AppDbContext db)
{
    public async Task<int> Handle(CreateProductCommand cmd, CancellationToken ct)
    {
        var product = new Product { Name = cmd.Name, Price = cmd.Price };
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        return product.Id;
    }
}
```

> Repository is worth it for real DDD aggregates with encapsulation rules, or when swapping data sources at runtime. Not for `GetAll()` wrappers.

---

## #7 — Returning `IEnumerable<T>` From Async Actions
**Severity: 🟠 Costs money**

`Where` + `Select` on a materialized list execute deferred during JSON serialization — 10,000 items means 10,000 delegate invocations on the hot path. P99 latency spikes, GC pressure rises.

```csharp
// ❌ Bad — deferred LINQ over materialized list during serialization
IEnumerable<Product> products = await db.Products.ToListAsync();
return products.Where(p => p.IsActive).Select(p => p.ToResponse());

// ✅ Fix — push filter into SQL, project at the DB level, materialize once
var products = await db.Products
    .Where(p => p.IsActive)
    .Select(p => new ProductResponse(p.Id, p.Name, p.Price))
    .ToListAsync();
return products;
```

---

## #8 — Singleton Injecting Scoped (Captive Dependency)
**Severity: 🔴 Kills production**

A Singleton captures a Scoped `DbContext` from the first request. Every subsequent request — every user — shares that one context. `DbContext` is not thread-safe → `InvalidOperationException` under concurrency, and potential **data leakage between users**.

```csharp
// ❌ Bad — singleton captures scoped DbContext
builder.Services.AddSingleton<CacheService>(); // CacheService(AppDbContext db)

// ✅ Fix — use IServiceScopeFactory to create a scope per cache miss
public sealed class CacheService(HybridCache cache, IServiceScopeFactory scopeFactory)
{
    public ValueTask<Product?> GetAsync(int id, CancellationToken ct) =>
        cache.GetOrCreateAsync($"product:{id}", async ct =>
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await db.Products.FindAsync([id], ct);
        }, cancellationToken: ct);
}
```

**Enable this — it catches captive deps at startup:**
```csharp
builder.Host.UseDefaultServiceProvider(opts => opts.ValidateScopes = true);
```

> On by default in Development, **off** in Production. Turn it on in Production too.

---

## #9 — Runtime-Reflection Mapper in a Native AOT Project
**Severity: 🟠 Costs money (broken AOT or silent runtime failures)**

AutoMapper and default Mapster use reflection at runtime. Native AOT trims that metadata at publish time → `MissingMetadataException` in production on types not exercised at build time. Build is green, smoke tests pass, first edge-case request crashes.

```xml
<!-- ❌ Bad — reflection mapper + AOT = runtime failure -->
<PublishAot>true</PublishAot>
<PackageReference Include="AutoMapper" Version="14.0.0" />
```

```csharp
// ✅ Fix — source-generated mapper, AOT-safe
<PackageReference Include="Riok.Mapperly" Version="4.2.1" />

[Mapper]
public partial class ProductMapper
{
    public partial ProductResponse ToResponse(Product product);
}
```

---

## #10 — Panic-Paying for Commercial Libraries
**Severity: 🟠 Costs money (literal)**

When MediatR and AutoMapper went commercial in 2025, many teams signed procurement forms without checking the free **Community tier** (available for orgs under $5M gross annual revenue). Others panic-migrated to less-mature alternatives on day one, shipping half-finished migrations that lingered for a quarter.

**Run this before any procurement or migration:**

1. Do we fit the free Community tier under the new license?
2. Is the last free version safe long-term (check security advisories)?
3. What does the alternative actually cost to adopt?
4. Does the alternative give us something the old library cannot?

> For most teams under $5M revenue — the panic was unnecessary. For larger teams, the migration (e.g. AutoMapper → Mapperly, MediatR → custom dispatcher) is a **planned engineering decision**, not a fire drill.

---

## Key Takeaways

- An anti-pattern **looks reasonable** on the surface — that is what makes it dangerous.
- The **4 production-killers** to fix before anything else: `async void`, sync-over-async, `new HttpClient()` per request, singleton injecting scoped.
- `ValidateScopes = true` in production catches captive dependency bugs at startup — enable it.
- `DbContext` in EF Core 10 is already a repository and Unit of Work — don't wrap it for CRUD.
- Push filters into `IQueryable` so EF Core translates them to SQL; materialize with `ToListAsync()` before returning.
- Native AOT + reflection-based mapper = production failure on untested code paths. Use Mapperly.
- Read the free tier terms **before** signing a procurement form or starting a migration.
