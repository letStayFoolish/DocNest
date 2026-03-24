---
title: JavaScript Tips & Tricks
description: Handy JS patterns, modern syntax, and common gotchas worth remembering.
tags: [javascript, es6, async, patterns]
category: JavaScript
date: 2024-02-10
---

## Destructuring

Destructuring makes extracting values from objects and arrays clean and readable.

```js
// Object destructuring with rename and default
const { name: firstName = "Anonymous", age } = user;

// Nested destructuring
const { address: { city, zip } } = profile;

// Array destructuring — skip elements with commas
const [first, , third] = items;

// Swap variables
let a = 1, b = 2;
[a, b] = [b, a];
```

## Optional Chaining and Nullish Coalescing

```js
// Optional chaining — safe access without throwing
const city = user?.address?.city;
const firstItem = arr?.[0];
const result = obj?.method?.();

// Nullish coalescing — only falls back on null/undefined
const displayName = user.name ?? "Guest";

// Combined
const zip = user?.address?.zip ?? "N/A";
```

## Array Methods

```js
// flatMap — map + flatten in one step
const sentences = ["Hello World", "Foo Bar"];
const words = sentences.flatMap(s => s.split(" "));
// ["Hello", "World", "Foo", "Bar"]

// findIndex
const idx = users.findIndex(u => u.id === targetId);

// at() — supports negative indexing
const last = arr.at(-1);
const secondToLast = arr.at(-2);

// Object.fromEntries — rebuild an object from entries
const doubled = Object.fromEntries(
  Object.entries(prices).map(([k, v]) => [k, v * 2])
);
```

## Async / Await Patterns

```js
// Run promises in parallel
const [user, posts] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
]);

// Settle all — get results even if some fail
const results = await Promise.allSettled([p1, p2, p3]);
results.forEach(r => {
  if (r.status === "fulfilled") console.log(r.value);
  else console.error(r.reason);
});

// async IIFE
(async () => {
  const data = await fetchData();
  console.log(data);
})();
```

## Closures and the Module Pattern

```js
function makeCounter(initial = 0) {
  let count = initial;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
    reset: () => { count = initial; },
  };
}

const counter = makeCounter(10);
counter.increment(); // 11
counter.value();     // 11
```

## Useful One-liners

```js
// Unique values
const unique = [...new Set(array)];

// Shuffle array (Fisher-Yates)
const shuffled = arr.sort(() => Math.random() - 0.5);

// Deep clone (works for JSON-serialisable data)
const clone = JSON.parse(JSON.stringify(obj));

// Group array by key
const grouped = items.reduce((acc, item) => {
  (acc[item.category] ??= []).push(item);
  return acc;
}, {});

// Truncate string
const truncate = (str, n) => str.length > n ? str.slice(0, n) + "…" : str;

// Sleep
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
```

## Common Gotchas

```js
// typeof null is "object" — use strict equality
typeof null === "object" // true (bug in JS spec)
null === null            // true ✓

// NaN is not equal to itself
NaN === NaN // false
Number.isNaN(NaN) // true ✓

// 0.1 + 0.2 floating point
0.1 + 0.2 === 0.3 // false
Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON // true ✓
```
