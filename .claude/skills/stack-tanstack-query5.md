# TanStack Query v5 — Correct Patterns

> TRIGGER: code imports from `@tanstack/react-query`.
> Richwood baseline: @tanstack/react-query ^5.90.0
> v5 has breaking changes from v4. Do NOT use v4 patterns.

## Single Object Parameter (Breaking)

All hooks now take a single object argument:

```ts
// WRONG — v4 positional arguments
useQuery(["todos"], fetchTodos, { staleTime: 5000 });
useMutation(createTodo, { onSuccess: () => {} });

// CORRECT — v5 single object
useQuery({ queryKey: ["todos"], queryFn: fetchTodos, staleTime: 5000 });
useMutation({ mutationFn: createTodo, onSuccess: () => {} });
```

## onSuccess/onError/onSettled REMOVED from useQuery

These callbacks were removed from `useQuery` in v5. They still exist on `useMutation`.

```tsx
// WRONG — v4 callbacks on useQuery
const { data } = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
  onSuccess: (data) => {
    toast.success("Loaded");
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

// CORRECT — v5 use derived state or useEffect
const { data, error } = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
});

// Handle errors via the error state
if (error) {
  // render error UI
}

// Or via global QueryClient defaults
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => toast.error(error.message),
  }),
});
```

## queryOptions() Helper (New in v5)

Type-safe, reusable query configuration:

```ts
import { queryOptions, useQuery } from '@tanstack/react-query';

// Define once
const todosQueryOptions = queryOptions({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5000,
});

// Use in components
function Todos() {
  const { data } = useQuery(todosQueryOptions);
  return <TodoList items={data} />;
}

// Use in prefetching
await queryClient.prefetchQuery(todosQueryOptions);

// Use in loaders
async function loader() {
  return queryClient.ensureQueryData(todosQueryOptions);
}
```

## throwOnError

Throw query errors to the nearest ErrorBoundary:

```tsx
const { data } = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
  throwOnError: true,
  // OR conditional:
  throwOnError: (error) => error.status >= 500,
});
```

## useMutation (Callbacks Still Work)

```tsx
const mutation = useMutation({
  mutationFn: (newTodo: NewTodo) => createTodo(newTodo),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] });
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

mutation.mutate({ title: "New todo" });
```

## Optimistic Updates

```tsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ["todos"] });
    const previous = queryClient.getQueryData(["todos"]);
    queryClient.setQueryData(["todos"], (old) => [...old, newTodo]);
    return { previous };
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(["todos"], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] });
  },
});
```

## Dependent Queries

```tsx
const { data: user } = useQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId),
});

const { data: projects } = useQuery({
  queryKey: ["projects", user?.id],
  queryFn: () => fetchProjects(user.id),
  enabled: !!user?.id, // Only runs when user is loaded
});
```

## Query Invalidation

```ts
// Invalidate exact key
queryClient.invalidateQueries({ queryKey: ["todos"] });

// Invalidate all queries starting with 'todos'
queryClient.invalidateQueries({ queryKey: ["todos"], exact: false });

// Remove from cache entirely
queryClient.removeQueries({ queryKey: ["todos"] });
```

## Quick Reference: v4 to v5

| v4 (Do Not Use)           | v5 (Use This)                              |
| ------------------------- | ------------------------------------------ |
| `useQuery(key, fn, opts)` | `useQuery({ queryKey, queryFn, ...opts })` |
| `useMutation(fn, opts)`   | `useMutation({ mutationFn, ...opts })`     |
| `onSuccess` on useQuery   | Use derived state or global QueryCache     |
| `onError` on useQuery     | Use `error` state or `throwOnError`        |
| `isLoading` (first load)  | `isPending` (renamed)                      |
| `cacheTime`               | `gcTime` (renamed)                         |
| `useQuery(key, fn)`       | `useQuery({ queryKey: key, queryFn: fn })` |

---

## Need More Detail?

For full API reference, use: `/stack-docs tanstack-query <topic>`
