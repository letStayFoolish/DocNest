# 10 EF Core Performance Mistakes (and How to Fix Them) in .NET 10

_TL;DR. The 10 EF Core performance mistakes that ship to production: (1) N+1 queries, (2) returning full entities instead of projections, (3) forgetting AsNoTracking on read-only queries, (4) leaving lazy loading on in production, (5) cartesian explosion from multiple Include calls, (6) filtering after materialization with .ToList() before .Where(), (7) loading entities just to update or delete them in bulk, (8) no pagination on list endpoints, (9) missing database indexes on filtered or joined columns, and (10) not using compiled queries on hot paths. Each one is fixable in under 10 lines of code. Together, they routinely turn 4-second endpoints into 80-millisecond endpoints._

## What Counts as an EF Core Performance Mistake?

An EF Core performance mistake is any query, configuration, or data-access pattern that produces correct results in development but degrades unacceptably under production load. The mistakes in this article have three things in common: the code compiles, the tests pass, and the slowdown only shows up when real data volume or real concurrency hits.

In .NET 10 with EF Core 10, the runtime is faster than ever. The JIT got better at inlining the materialization hot path, generic specialization is cheaper, and EF Core 10 added first-class LeftJoin and RightJoin operators (along with consistent ordering fixes for split queries). None of that helps if your code keeps making the same 10 mistakes below. Performance comes from the patterns you write, not the framework version.

## How to Spot These in Your Codebase

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString)
           .LogTo(Console.WriteLine, LogLevel.Information)
           .EnableSensitiveDataLogging(builder.Environment.IsDevelopment()));
```

 ### One example of using `.Select()` over `.Include()`:

**Before (Include):**
```sql
 SELECT t0."Id", t0."AccountId", t0."Amount", ..., t0."UpdatedAt", t0."UserId",
         c."Id", c."ColorHex", c."CreatedAt", c."Icon", c."IsActive", c."IsSystem",
         c."Name", c."Slug", c."SortOrder", c."UpdatedAt",
         s."Id", s."CategoryId", s."CreatedAt", s."IsActive", s."Name", ...
         a."Id", a."CreatedAt", a."CurrencyCode", a."IsActive", a."IsDefault", ...
```

**After (.Select()):**
```sql
SELECT t0."Id", t0."CategoryId", c."Name", c."Slug", c."ColorHex", c."Icon",
         t0."SubCategoryId", s."Name",
         t0."AccountId", a."Name", a."Type",
         t0."Type", t0."Amount", ...
```

The database now sends only what the DTO actually needs. Notice the inner query too — before it selected UpdatedAt and UserId from Transactions even though neither appears in TransactionDto. Now it doesn't.

Timing also dropped: **204ms → 178ms** on the action, and this is a small dataset on a local machine. On your cloude/remote server with a larger dataset and real network latency between app and database, the difference in bytes transferred will be more  meaningful.

## Mistake 1: The N+1 Query Problem

This is the universal #1 EF Core performance killer. You load a list of entities with one query, and then your code triggers a separate database query for each entity when it accesses a related navigation property.

```csharp
var orders = await context.Orders.ToListAsync(ct);

foreach (var order in orders)
{
    // Each access here fires a separate SELECT to the database
    Console.WriteLine($"{order.Customer.Name} - {order.Total}");
}
```

If you have 100 orders, this runs 101 queries. One for the list, and one for each customer. On a list endpoint with 1,000 rows, you’ve just generated 1,001 database round trips for what should have been a single query.

**The Fix:**

```csharp
// Option 1: Eager load with Include
var orders = await context.Orders
    .Include(o => o.Customer)
    .ToListAsync(ct);

// Option 2: Project to a DTO (often better)
var orders = await context.Orders
    .Select(o => new OrderListItem
    {
        Id = o.Id,
        CustomerName = o.Customer.Name,
        Total = o.Total
    })
    .ToListAsync(ct);
```

Projection is usually the better fix because it also solves mistake #2. Use `.Include()` when you genuinely need the full related entity for further logic, and projection when you’re returning data to a client.

The hidden version of this mistake is the N+1 via JSON serialization trap. If lazy loading is on (see mistake #4) and your API serializes a navigation property to JSON, the serializer triggers a lazy load while writing the response. The query log shows queries firing from inside `System.Text.Json`. I have lost hours to this one.

## Mistake 2: Returning Full Entities Instead of Projections

You return entire database entities from API endpoints when the client only needs three fields. The query loads 20 columns from disk, hydrates 20 properties on a tracked entity, snapshots them for change detection, then serializes 20 properties to JSON, where the client uses three.

**The wrong code:**

```csharp
app.MapGet("/products", async (AppDbContext db, CancellationToken ct) =>
{
    var products = await db.Products.ToListAsync(ct);
    return Results.Ok(products);
});
```

This loads every column, including Description (which can be a large text blob), InternalNotes, CostPrice, and everything else, even if the client only needs Id, Name, and Price.

**The fix:**

```csharp
app.MapGet("/products", async (AppDbContext db, CancellationToken ct) =>
{
    var products = await db.Products
        .Select(p => new ProductListItem
        {
            Id = p.Id,
            Name = p.Name,
            Price = p.Price
        })
        .ToListAsync(ct);

    return Results.Ok(products);
});
```

Projection through Select() generates more efficient SQL (fewer columns), skips change tracking automatically, prevents over-fetching wide tables, and gives you a stable DTO contract that doesn’t leak internal entity properties to clients. On a 20-column table with 5,000 rows, swapping ToListAsync() for a 3-column projection routinely cuts response payload size by 70% and query execution time by 30 to 50%.

_My take: every list endpoint should return a DTO via projection, never a raw entity. Use entities for write paths and lookups by ID. Use projections for everything that goes back to a client._

## Mistake 3: Forgetting AsNoTracking on Read-Only Queries

By default, EF Core tracks every entity it loads through the `ChangeTracker`. This is how `SaveChanges()` knows what to update. But on a typical API, 80% of your endpoints are reads. They load data, serialize it, and return it. They never call `SaveChanges()`. The tracking is pure overhead.

**The wrong code:**

```csharp
var orders = await context.Orders
    .Where(o => o.CreatedAt > DateTime.UtcNow.AddDays(-7))
    .ToListAsync(ct);
// Every order is now in the ChangeTracker. EF keeps a snapshot
// of every property to detect changes that will never happen.
```

**The fix:**

```csharp
var orders = await context.Orders
    .AsNoTracking()
    .Where(o => o.CreatedAt > DateTime.UtcNow.AddDays(-7))
    .ToListAsync(ct);
```

Or set it globally on the `DbContext` so the safe choice is the default:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString)
           .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));
```

With `QueryTrackingBehavior.NoTracking` as the default, you opt back into tracking only on the write paths where you genuinely need it, by calling `.AsTracking()` on the specific query. In benchmarks on a medium-sized dataset of around 10,000 rows, `AsNoTracking()` consistently shows 20 to 40% faster query execution for pure reads, plus lower memory pressure and faster garbage collection.

One caveat: if you’re using optimistic concurrency tokens (`[Timestamp]` or `xmin`), you’ll want tracking on the queries that lead into a `SaveChanges()` call. Don’t blanket-disable tracking on those paths.

## Mistake 4: Leaving Lazy Loading Enabled in Production

Lazy loading is a feature that quietly fires a database query the first time you touch a navigation property. It sounds convenient in theory, and it’s a disaster in production because the queries fire from places you don’t expect, like inside JSON serialization, inside mapping code, inside logging.

**The wrong setup:**

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString)
           .UseLazyLoadingProxies()); // Don't.
```

Now any code that reads `order.Customer.Name` triggers a query. The serializer iterating through navigation properties? Queries. A mapping library that walks all properties? Queries. A logger that calls `ToString()`? Maybe queries. You end up with non-deterministic N+1 storms that only show up under load.

**The fix:**

```csharp
// Don't call UseLazyLoadingProxies. Use explicit eager loading
// or projections instead.

var order = await context.Orders
    .Include(o => o.Customer)
    .Include(o => o.LineItems)
    .FirstOrDefaultAsync(o => o.Id == id, ct);

// Or even better - project exactly what you need
var orderDto = await context.Orders
    .Where(o => o.Id == id)
    .Select(o => new OrderDetail
    {
        Id = o.Id,
        CustomerName = o.Customer.Name,
        Items = o.LineItems.Select(i => new LineItemDto
        {
            ProductName = i.Product.Name,
            Quantity = i.Quantity
        }).ToList()
    })
    .FirstOrDefaultAsync(ct);
```

Explicit eager loading via `Include` makes the dependency visible in the code. 
Projection makes the shape of the data part of the contract. Both let you reason about 
exactly what SQL runs, when, and how big it is.

_My take: never enable lazy loading proxies on a server-side ASP.NET Core app. The 
implicit query firing is incompatible with the way HTTP handlers should reason about 
database access._

## Mistake 5: Cartesian Explosion from Multiple Includes

When you eagerly load two or more collection navigation properties in a single query, EF Core generates LEFT JOINs that produce a cross product. With a Department that has 10 Projects and 10 Employees, the database returns 100 rows for that single Department. With more collections, the row count multiplies. This is called a **cartesian explosion**, and it’s a different problem from the N+1.

**The wrong code:**

```csharp
var departments = await context.Departments
    .Include(d => d.Projects)
    .Include(d => d.Employees)
    .ToListAsync(ct);
```

The SQL looks fine until you check the row count. With 50 departments, 20 projects each, and 30 employees each, that one query returns 30,000 rows of mostly duplicated department data. EF Core de-duplicates on the client side, but the wire transfer and the deserialization cost have already been paid.

**The fix:**

```csharp
var departments = await context.Departments
    .AsSplitQuery()
    .Include(d => d.Projects)
    .Include(d => d.Employees)
    .ToListAsync(ct);
```

`AsSplitQuery()` tells EF Core to execute one query per `Include` and stitch the results together in memory. You get three smaller queries instead of one massive cross-joined query. The tradeoff is the three queries hit the network three times. The rule I use: if you’re including 2+ collections AND the cross product is more than 10x the parent count, use `AsSplitQuery`. If it’s a single collection or the multiplier is small, the default single-query mode is fine.

You can also set this globally per `DbContext`:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));
```

## Mistake 6: Filtering After Materialization

This is the silent killer. You call `.ToListAsync()` first, then call `.Where()` on the result. EF Core materialized the entire table into memory, and the filter ran client-side. On a table with 100,000 rows, you just loaded 100,000 rows over the wire to keep 12 of them.

**The wrong code:**

```csharp
var orders = (await context.Orders.ToListAsync(ct))
    .Where(o => o.CreatedAt > DateTime.UtcNow.AddDays(-7))
    .Take(20);
```

The `.ToListAsync()` happens before the `.Where()` because it’s wrapped in parentheses. SQL Server happily streams every row of the Orders table to your app server, and then C# does the filtering after the data is already in memory. The endpoint is now bottlenecked on network I/O and the table size, not on what you actually want.

**The fix:**

```csharp
var orders = await context.Orders
    .Where(o => o.CreatedAt > DateTime.UtcNow.AddDays(-7))
    .OrderByDescending(o => o.CreatedAt)
    .Take(20)
    .AsNoTracking()
    .ToListAsync(ct);
```

The order matters. Always filter, sort, and page **BEFORE** you materialize. `IQueryable<T>` builds the SQL expression tree lazily, and only `ToListAsync()`, `FirstAsync()`, `CountAsync()`, and similar terminal operators execute it. Anything you do after a terminal operator runs on objects in memory.

A related anti-pattern is client-side evaluation. If your Where predicate calls a C# method EF Core can’t translate to SQL, EF Core 3+ throws an exception by default instead of silently switching to client-side evaluation. That’s a feature, not a bug. Don’t try to bypass it. Refactor the query.

## Mistake 7: Loading Entities Just to Update or Delete Them in Bulk

You want to mark 10,000 orders as archived. You write a clean foreach loop that loads each order, sets the flag, and calls `SaveChanges()`. The job takes 5 minutes. Then your CSV import endpoint times out and your DBA sends you a message at 11 PM.

**The wrong code:**

```csharp
var oldOrders = await context.Orders
    .Where(o => o.CreatedAt < DateTime.UtcNow.AddYears(-1))
    .ToListAsync(ct);

foreach (var order in oldOrders)
{
    order.IsArchived = true;
}

await context.SaveChangesAsync(ct);
```

EF Core just loaded every column of 10,000 rows, hydrated 10,000 tracked entity instances, ran change detection on all of them, and then generated 10,000 individual `UPDATE` statements (batched, but still 10,000 statements). All to flip one boolean column.

**The fix using EF Core 10’s set-based operations:**

```csharp
await context.Orders
    .Where(o => o.CreatedAt < DateTime.UtcNow.AddYears(-1))
    .ExecuteUpdateAsync(updates => updates
        .SetProperty(o => o.IsArchived, true)
        .SetProperty(o => o.ArchivedAt, DateTime.UtcNow), ct);
```

One SQL statement. No entities loaded. No change tracking. No round trip per row. Just a single `UPDATE` that runs on the database server where it should. Same story for deletes:

```csharp
await context.Orders
    .Where(o => o.IsArchived && o.CreatedAt < DateTime.UtcNow.AddYears(-3))
    .ExecuteDeleteAsync(ct);
```

In my own benchmarks of EF Core 10 bulk operations, `ExecuteUpdateAsync` and `ExecuteDeleteAsync` come out 300 to 500x faster than the load-then-SaveChanges pattern on 10,000-row updates. The catch: these methods bypass the change tracker entirely, which means EF Core interceptors don’t fire, global query filters are not applied to the update predicate (you have to add them yourself), and audit trail logic that hooks into `SaveChanges` does not run. Plan for that explicitly. If you need interceptor behavior, stick with `SaveChanges` and accept the cost.

## Mistake 8: No Pagination on List Endpoints

Your `/products` endpoint returns the full `Products` table. In development, it has 50 rows. In production, the catalog import job runs and adds 200,000 SKUs overnight. The next morning, every dashboard loading that endpoint is hung, and your APM tool is screaming.

**The wrong code:**

```csharp
app.MapGet("/products", async (AppDbContext db, CancellationToken ct) =>
{
    var products = await db.Products.AsNoTracking().ToListAsync(ct);
    return Results.Ok(products);
});
```

Returning the entire table works fine until it doesn’t. The fix is to always paginate list endpoints from day one, even when the table is small. You’ll be glad you did the day production data shows up.

**The fix with offset pagination:**

```csharp
app.MapGet("/products", async (
    int page,
    int pageSize,
    AppDbContext db,
    CancellationToken ct) =>
{
    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 100);

    var query = db.Products.AsNoTracking().OrderBy(p => p.Id);

    var totalCount = await query.CountAsync(ct);
    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(p => new ProductListItem
        {
            Id = p.Id,
            Name = p.Name,
            Price = p.Price
        })
        .ToListAsync(ct);

    return Results.Ok(new { items, totalCount, page, pageSize });
});
```

Two things matter here. First, always cap `pageSize` **server-side**. Never trust the client to choose a sane value. Second, on tables larger than a million rows, switch from offset pagination (`Skip`/`Take`) to keyset pagination using a cursor. Offset pagination forces SQL Server or PostgreSQL to count and skip rows for every page, which gets slow as the page number grows. Keyset pagination uses a `WHERE` clause on an indexed column and scales constantly regardless of page depth.

## Mistake 9: Missing Database Indexes on Filtered or Joined Columns

EF Core gives you a beautiful LINQ query. The database happily runs it. Without an index on the filtered column, the database is doing a full table scan every time. With 10,000 rows in development, it’s fast. With 10 million rows in production, the same query takes 8 seconds.

**The wrong setup:**

```csharp
public class Product
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = null!;
    public string Name { get; set; } = null!;
    public Guid CategoryId { get; set; }
    // No indexes declared
}
```

Every query that does `Where(p => p.Sku == sku)` or joins on `CategoryId` is a full scan.

**The fix using Fluent API:**

```csharp
public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasIndex(p => p.Sku).IsUnique();
        builder.HasIndex(p => p.CategoryId);
        builder.HasIndex(p => new { p.CategoryId, p.CreatedAt }); // Composite
    }
}

```

Or with the `[Index]` attribute on the entity:

```csharp
[Index(nameof(Sku), IsUnique = true)]
[Index(nameof(CategoryId))]
[Index(nameof(CategoryId), nameof(CreatedAt))]
public class Product { /* ... */ }
```

Run `dotnet ef migrations add AddProductIndexes` and then `dotnet ef database update`. Indexes do cost write performance and storage, so don’t index every column. Index the ones that show up in `WHERE`, `JOIN`, and `ORDER BY` clauses in your hot queries. A good rule: if a query is on a hot path and filters on a column with more than a few thousand distinct values, that column wants an index.

## Mistake 10: Not Using Compiled Queries on Hot Paths

Every time you execute a LINQ query, EF Core walks the expression tree and translates it to SQL. For most queries, that’s a few microseconds and you never notice. On hot paths that fire thousands of times per second, the translation cost adds up. EF Core supports compiled queries, where you compile the LINQ-to-SQL translation once and reuse the delegate forever.

**The wrong code on a hot path:**

```csharp
app.MapGet("/products/{id:guid}", async (
    Guid id,
    AppDbContext db,
    CancellationToken ct) =>
{
    var product = await db.Products
        .AsNoTracking()
        .FirstOrDefaultAsync(p => p.Id == id, ct);

    return product is null ? Results.NotFound() : Results.Ok(product);
});
```

This is correct, but on an endpoint serving 5,000 RPS, the LINQ translation cost is non-trivial.

**The fix using EF.CompileAsyncQuery:**

```csharp
private static readonly Func<AppDbContext, Guid, CancellationToken, Task<Product?>> GetProductById =
    EF.CompileAsyncQuery((AppDbContext db, Guid id, CancellationToken ct) =>
        db.Products
            .AsNoTracking()
            .FirstOrDefault(p => p.Id == id));

app.MapGet("/products/{id:guid}", async (
    Guid id,
    AppDbContext db,
    CancellationToken ct) =>
{
    var product = await GetProductById(db, id, ct);
    return product is null ? Results.NotFound() : Results.Ok(product);
});

```

In benchmarks I’ve run on a single-row primary-key lookup, the compiled query consistently runs 30 to 60% faster than the equivalent ad-hoc LINQ query. EF Core 9 also introduced an experimental precompiled queries feature (tied to .NET NativeAOT support) that pushes the gap even further on workloads with many query executions, though it remains in preview and has documented limitations. The compiled-query route makes the most sense on a handful of critical endpoints, not on every query in the codebase. Profile first, then compile the hot 5% that actually matter.

## When to Use What: The Decision Matrix

**Some of these fixes overlap. Here’s how I decide which one to reach for first:**

| Symptom | First fix to try | Then |
|---|---|---|
| Endpoint returns full entities, big payloads | Projection via `Select` | Then `AsNoTracking` |
| 50+ SQL queries fire for one request | Add `Include` or projection | Check for lazy loading |
| Single query returns 30,000 rows for 50 entities | `AsSplitQuery` | Or project specific columns |
| Bulk update or delete is slow | `ExecuteUpdateAsync` / `ExecuteDeleteAsync` | Use `EFCore.BulkExtensions` for 50K+ rows |
| List endpoint times out under load | Add pagination | Then `AsNoTracking` + projection |
| `WHERE` query is slow | Add an index on the filtered column | Verify the SQL with `EXPLAIN` |
| Hot endpoint with high RPS | Compile the query with `EF.CompileAsyncQuery` | Consider `HybridCache` for stable reads |

The rule I follow: fix the cheapest, highest-impact mistake first, then measure again. Most APIs jump from 80th to 95th percentile performance by fixing just three of these (projections, AsNoTracking, pagination) before touching anything advanced.

## What EF Core 10 Improves Out of the Box

Some of these mistakes are easier to fix in EF Core 10 than in older versions, even without changing your patterns:

- **LeftJoin and RightJoin as first-class operators:** You no longer need the awkward `GroupJoin + SelectMany + DefaultIfEmpty` pattern. Cleaner LINQ, identical SQL, fewer footguns.

- **More consistent ordering for split queries:** EF Core 10 fixed a subtle correctness issue where `AsSplitQuery` combined with `Take` and `Include` could produce non-deterministic results because the subquery ordering omitted the primary key. The fix ensures the same ordering is applied across all split queries.

- **Faster materialization:** .NET 10’s JIT improvements (better inlining of the hot materialization path, stronger devirtualization, cheaper generic specialization) make every EF Core query run faster without changing a line.

- **Improved translation for parameterized collections:** EF Core 10 changes the default translation of `IEnumerable.Contains` to use individual scalar parameters with padding, giving the query planner better cardinality information while still preserving plan cache reuse.

None of these fix the 10 mistakes for you. They make the right patterns slightly faster, and they don’t rescue bad patterns. The mistakes still ship to production unless you fix the code.

## Key Takeaways


- **Projection + `AsNoTracking` + pagination is the 80% solution:** Apply those three on every list endpoint by default.

- **N+1 queries are the #1 killer:** Detect them by logging SQL with `LogTo` in development. Fix them with `Include` or projection.

- **Lazy loading proxies do not belong on a server-side ASP.NET Core app:** Use explicit eager loading or projections.

- **`AsSplitQuery` is your fix for cartesian explosion:** Use it when you genuinely need 2+ collections. The default single-query mode is fine for single-collection includes.

- **`ExecuteUpdateAsync` and `ExecuteDeleteAsync` are 300–500x faster than load-then-`SaveChanges`:** Use them for any bulk write that doesn’t need interceptors.

- **Indexes matter as much as query structure:** Profile your hot queries and index the columns in their `WHERE`, `JOIN`, and `ORDER BY` clauses.

- **Compiled queries belong on the hot 5% of endpoints:** Profile first, then compile.

- **Measure before and after every change:** Use `LogTo`, `dotnet-trace`, `MiniProfiler`, or `BenchmarkDotNet`. Performance work without measurement is folk magic.

