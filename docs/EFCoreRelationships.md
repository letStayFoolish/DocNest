---
title: EF Core Relationships
description: How to configure One-to-One, One-to-Many, and Many-to-Many relationships using Fluent API — with common mistakes and cascade delete rules.
tags: [efcore, dotnet, database, relationships, fluent-api]
category: EFCore
date: 2026-03-24
---

## What Are Relationships in EF Core?

**A relationship in Entity Framework Core defines how two entities are connected through a foreign key and navigation properties.** EF Core maps the references between C# objects to foreign key constraints in the database, keeping both sides in sync automatically.

### Terminology

**Principal Entity** — the entity that contains the primary key being referenced (e.g., `Customer`).

**Dependent Entity** — the entity that contains the foreign key (e.g., `Order`).

**Navigation Property** — a C# property that references the related entity (e.g., `Order.Customer` or `Customer.Orders`).

**Foreign Key Property** — the property in the dependent that stores the principal's key value (e.g., `Order.CustomerId`).

### Three Relationship Types

| Type | Example | FK Location |
| --- | --- | --- |
| One-to-One | Customer → CustomerProfile | Either side (typically the dependent) |
| One-to-Many | Customer → Orders | On the "many" side (dependent) |
| Many-to-Many | Product ↔ Tag | In a join table (separate or implicit) |

---

## One-to-Many

### Convention vs Fluent API

**The default delete behaviour is `Cascade`** — deleting a `Customer` silently wipes all its `Orders`.

**Fluent API lets you override defaults and configure relationships explicitly.**

```csharp
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.Id);

        builder.Property(o => o.TotalAmount)
               .HasPrecision(18, 2);

        builder.HasOne(o => o.Customer)
               .WithMany(c => c.Orders)
               .HasForeignKey(o => o.CustomerId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(o => o.CustomerId);
    }
}
```

What the fluent chain does:

- `HasOne(o => o.Customer)` — this `Order` has one related `Customer`
- `WithMany(c => c.Orders)` — that `Customer` has many `Order` entities
- `HasForeignKey(o => o.CustomerId)` — the FK linking them
- `OnDelete(DeleteBehavior.Restrict)` — prevent deleting a customer who has orders

> **Always be explicit about delete behaviour.** The default `Cascade` for required relationships can accidentally wipe out important data. Use `Restrict` for business entities and handle delete logic in the application.

---

## One-to-One

Each entity on both sides is associated with at most one entity on the other side. Think: a customer has exactly one profile, or an order has exactly one shipping address record.

```csharp
public class CustomerProfileConfiguration : IEntityTypeConfiguration<CustomerProfile>
{
    public void Configure(EntityTypeBuilder<CustomerProfile> builder)
    {
        builder.ToTable("customer_profiles");
        builder.HasKey(cp => cp.Id);
        builder.Property(cp => cp.PhoneNumber).HasMaxLength(20);
        builder.Property(cp => cp.ShippingAddress).HasMaxLength(500);

        builder.HasOne(cp => cp.Customer)
            .WithOne(c => c.CustomerProfile)
            .HasForeignKey<CustomerProfile>(cp => cp.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(cp => cp.CustomerId).IsUnique();
    }
}
```

Key differences from One-to-Many:

- `WithOne` instead of `WithMany` — both sides reference a single entity
- `HasForeignKey<CustomerProfile>` — you **must** specify the generic type to tell EF Core which side is the dependent; it can't infer this automatically in one-to-one relationships

The unique index on `CustomerId` enforces the constraint at the database level — each customer gets at most one profile.

> Cascade delete makes sense here because a profile has no meaning without its customer. Evaluate this case by case — not every one-to-one warrants cascading.

---

## Many-to-Many

### Simple (No Payload)

```csharp
public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Price).HasPrecision(18, 2);

        builder.HasMany(p => p.Tags)
               .WithMany(t => t.Products)
               .UsingEntity(j => j.ToTable("ProductTags"));
    }
}
```

`UsingEntity` is optional but lets you control the join table name. Without it, EF Core auto-generates one. Adding and querying tags is straightforward:

```csharp
var product = await dbContext.Products.FindAsync(productId, cancellationToken);
var tag = await dbContext.Tags.FindAsync(tagId, cancellationToken);

product!.Tags.Add(tag!);
await dbContext.SaveChangesAsync(cancellationToken);

// Query products with their tags
var productsWithTags = await dbContext.Products
    .Include(p => p.Tags)
    .ToListAsync(cancellationToken);
```

### With Payload (Explicit Join Entity)

When the join itself carries data (e.g., a `ProductTag` with an `AssignedAt` date), you need an explicit join entity:

```csharp
public class ProductTag
{
    public Guid ProductId { get; set; }
    public Guid TagId { get; set; }
    public DateTime AssignedAt { get; set; }

    public Product Product { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}

public class ProductTagConfiguration : IEntityTypeConfiguration<ProductTag>
{
    public void Configure(EntityTypeBuilder<ProductTag> builder)
    {
        builder.HasKey(pt => new { pt.ProductId, pt.TagId });

        builder.HasOne(pt => pt.Product)
               .WithMany(p => p.ProductTags)
               .HasForeignKey(pt => pt.ProductId);

        builder.HasOne(pt => pt.Tag)
               .WithMany(t => t.ProductTags)
               .HasForeignKey(pt => pt.TagId);
    }
}
```

---

## Cascade Delete Behaviour

| Behaviour | What Happens | Use When |
| --- | --- | --- |
| `Cascade` | Delete parent → delete all children | Children are meaningless without parent (e.g., `OrderItems`) |
| `Restrict` | Delete parent → throw if children exist | Children have independent business value (e.g., `Products`) |
| `SetNull` | Delete parent → set FK to null (FK must be nullable) | Optional relationships, children can exist alone |
| `NoAction` | Database decides (usually throws) | Rare — when you handle everything manually |

---

## Common Mistakes

### Mistake 1: Configuring the Same Relationship from Both Sides

```csharp
// In OrderConfiguration
builder.HasOne(o => o.Customer).WithMany(c => c.Orders);

// In CustomerConfiguration — DON'T DO THIS
builder.HasMany(c => c.Orders).WithOne(o => o.Customer);
```

Both lines describe the same relationship. Configure it **once**, from one side — typically the dependent (the entity with the FK).

### Mistake 2: Missing Navigation Properties

```csharp
public class Order
{
    public Guid CustomerId { get; set; }
    // Missing: public Customer Customer { get; set; }
}
```

Without navigation properties you can't use `Include()` for eager loading or navigate relationships in LINQ. Always add them on at least one side — ideally both.

### Mistake 3: Forgetting Indexes on Foreign Keys

EF Core creates indexes on foreign keys automatically in most cases, but always verify by reviewing your migrations:

```bash
dotnet ef migrations add VerifyRelationships
dotnet ef migrations script
```

### Mistake 4: Cascade Delete on Self-Referencing Relationships

If a `Category` has a `ParentCategoryId` pointing to itself, never use cascade delete — it would recursively wipe the entire category tree.

---

## Summary

- **One-to-many** — most common; use `HasOne().WithMany().HasForeignKey()`
- **One-to-one** — requires specifying the dependent side with `HasForeignKey<T>()`
- **Many-to-many** (EF Core 5+) — no join entity needed for simple cases; add one when the join carries payload
- Always set `OnDelete` **explicitly** — cascade defaults can destroy production data
- Configure each relationship from **one side only** — typically the dependent entity

## Sources

- [EF Core Relationships — codewithmukesh.com](https://codewithmukesh.com/blog/ef-core-relationships-one-to-one-one-to-many-many-to-many/)
- [Introduction to relationships — Microsoft Docs](https://learn.microsoft.com/en-us/ef/core/modeling/relationships)
- [Cascade Delete — Microsoft Docs](https://learn.microsoft.com/en-us/ef/core/saving/cascade-delete)
