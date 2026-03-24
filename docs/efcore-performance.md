---
title: EF Core Performance Mistakes
description: Five common Entity Framework Core mistakes that silently kill performance — and how to fix each one.
tags: [efcore, dotnet, performance, database, sql]
category: EFCore
date: 2026-03-24
---

## 1. No Projections

You return full entities when the client only needs 3 fields.

```csharp
// Bad — loads every column
var users = await context.Users.ToListAsync();

// Good — only fetch what you need
var users = await context.Users
    .Select(x => new { x.Id, x.Name, x.Status })
    .ToListAsync();
```

Less data transferred, faster serialization, smaller SQL query.

---

## 2. N+1 Queries

You load orders, then loop and query each customer separately.

```csharp
// Bad — 1 query for orders + 1 per customer = 51 queries
var orders = await context.Orders.ToListAsync();
foreach (var order in orders)
{
    var customer = await context.Customers.FindAsync(order.CustomerId);
}

// Good — 1 query with a JOIN
var orders = await context.Orders
    .Include(o => o.Customer)
    .ToListAsync();
```

1 SQL query instead of 51.

---

## 3. Tracking Read-Only Data

EF Core tracks every entity by default. Change tracking costs memory and CPU.

```csharp
// Bad — tracked by default
var products = await context.Products.ToListAsync();

// Good — skip tracking for read-only queries
var products = await context.Products
    .AsNoTracking()
    .ToListAsync();
```

30–40% faster on large result sets.

---

## 4. Late Filtering

Calling `.ToListAsync()` before `.Where()` loads everything into memory first, then filters in your app.

```csharp
// Bad — loads ALL orders into memory, then filters
var orders = await context.Orders.ToListAsync();
var recent = orders.Where(o => o.CreatedAt > cutoff).ToList();

// Good — filter, sort, and page BEFORE materializing
var recent = await context.Orders
    .Where(o => o.CreatedAt > cutoff)
    .OrderByDescending(o => o.CreatedAt)
    .Skip(page * pageSize)
    .Take(pageSize)
    .ToListAsync();
```

SQL Server does the work instead of your app server.

---

## 5. SingleOrDefault vs FirstOrDefault

`SingleOrDefault` scans the entire result set to guarantee uniqueness — even when you only need the first match.

```csharp
// Bad — scans entire table to assert uniqueness
var user = await context.Users
    .SingleOrDefaultAsync(u => u.Email == email);

// Good — stops at the first match
var user = await context.Users
    .FirstOrDefaultAsync(u => u.Email == email);
```

Faster queries, especially on large tables. Reserve `SingleOrDefault` for cases where you actually need to assert uniqueness.

---

## Quick Checklist

- [ ] All read-only queries use `.AsNoTracking()`
- [ ] Queries filter and page **before** `.ToListAsync()`
- [ ] Related data loaded with `.Include()`, not in a loop
- [ ] Projections used instead of full entities where possible
- [ ] `FirstOrDefaultAsync` used unless uniqueness must be enforced
