---
title: React Patterns & Best Practices
description: Reusable patterns for React components, hooks, performance, and state management.
tags: [react, hooks, patterns, performance]
category: React
date: 2024-03-01
---

## Component Patterns

### Compound Components

Group related components under a shared namespace for a clean API.

```tsx
// Usage
<Select>
  <Select.Trigger>Choose option</Select.Trigger>
  <Select.Menu>
    <Select.Option value="a">Option A</Select.Option>
    <Select.Option value="b">Option B</Select.Option>
  </Select.Menu>
</Select>
```

### Render Props

```tsx
function DataFetcher({ url, render }: { url: string; render: (data: unknown) => React.ReactNode }) {
  const [data, setData] = useState(null);
  useEffect(() => { fetch(url).then(r => r.json()).then(setData); }, [url]);
  return <>{render(data)}</>;
}

// Usage
<DataFetcher url="/api/users" render={(data) => <UserList data={data} />} />
```

## Custom Hooks

### useLocalStorage

```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setItem = (newValue: T) => {
    setValue(newValue);
    localStorage.setItem(key, JSON.stringify(newValue));
  };

  return [value, setItem] as const;
}
```

### useDebounce

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// Usage — live search without hammering an API
const debouncedQuery = useDebounce(searchInput, 300);
```

### useOnClickOutside

```tsx
function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}
```

## Performance

### Memoisation

```tsx
// memo — skip re-render when props haven't changed
const ExpensiveList = React.memo(function ExpensiveList({ items }) {
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
});

// useMemo — expensive computation
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// useCallback — stable function reference for children
const handleClick = useCallback((id: string) => {
  dispatch({ type: "SELECT", id });
}, [dispatch]);
```

### Lazy Loading

```tsx
const HeavyChart = lazy(() => import("./HeavyChart"));

function Dashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyChart />
    </Suspense>
  );
}
```

## State Management Tips

```tsx
// Prefer useReducer for complex state
type Action =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "reset"; payload: number };

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case "increment": return state + 1;
    case "decrement": return state - 1;
    case "reset":     return action.payload;
  }
}

const [count, dispatch] = useReducer(reducer, 0);
dispatch({ type: "reset", payload: 10 });
```

## Key Rules to Remember

- **Never mutate state** — always return new objects/arrays
- **Keys must be stable and unique** — avoid array index as key for dynamic lists
- **Effects run after paint** — put expensive subscriptions in `useEffect`
- **Cleanup effects** — return a cleanup function from `useEffect` when subscribing
- **Avoid prop drilling beyond 2 levels** — reach for Context or a state library
