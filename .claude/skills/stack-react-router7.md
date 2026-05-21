# React Router v7 — Correct Patterns

> TRIGGER: code imports from `react-router` or `react-router-dom`.
> Richwood baseline: react-router ^7.0.0
> Import from `react-router`, NOT `react-router-dom`.

## Import Change (Breaking)

```ts
// WRONG — react-router-dom is deprecated
import { useLocation, Link, Outlet } from "react-router-dom";
import { RouterProvider } from "react-router-dom";

// CORRECT — general imports
import {
  useLocation,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "react-router";

// CORRECT — DOM-specific imports only
import { RouterProvider } from "react-router/dom";
```

Only `react-router` is needed in `package.json`. Remove `react-router-dom`.

## Route Configuration (Library Mode)

```tsx
import { createBrowserRouter, RouterProvider } from "react-router/dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: "users",
        element: <Users />,
        loader: usersLoader,
      },
      {
        path: "users/:id",
        element: <UserDetail />,
        loader: userDetailLoader,
        action: userAction,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

## Loaders and Actions

### Return plain objects (json/defer removed)

```tsx
// WRONG — json() is removed in v7
import { json } from "react-router-dom";
async function loader() {
  return json({ users: await fetchUsers() });
}

// CORRECT — return plain objects
async function loader() {
  const users = await fetchUsers();
  return { users };
}

// If you need a Response:
async function loader() {
  return Response.json({ users: await fetchUsers() });
}
```

### Actions

```tsx
// CORRECT — action receives request
async function action({ request, params }) {
  const formData = await request.formData();
  await updateUser(params.id, Object.fromEntries(formData));
  return { success: true };
}

// Use data in component
import { useLoaderData, useActionData } from "react-router";

function UserDetail() {
  const { user } = useLoaderData();
  const actionData = useActionData();
  return <div>{user.name}</div>;
}
```

## Form Method Normalization (Breaking)

```tsx
// WRONG — v6 lowercase methods
if (navigation.formMethod === "post") {
}

// CORRECT — v7 UPPERCASE methods
if (navigation.formMethod === "POST") {
}
```

This applies to `useNavigation().formMethod`, `useFetcher().formMethod`, and `useSubmit`.

## Navigation

```tsx
import { Link, NavLink, useNavigate, Form } from 'react-router';

// Links
<Link to="/users">Users</Link>
<NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
  Users
</NavLink>

// Programmatic navigation
const navigate = useNavigate();
navigate('/users');
navigate(-1); // back

// Form submission (triggers action)
<Form method="POST" action="/users">
  <input name="name" />
  <button type="submit">Create</button>
</Form>
```

## Hooks

```tsx
import {
  useParams,
  useSearchParams,
  useLocation,
  useNavigate,
  useLoaderData,
  useActionData,
  useNavigation,
  useRouteError,
  useFetcher,
} from "react-router";

// URL params
const { id } = useParams();

// Search params
const [searchParams, setSearchParams] = useSearchParams();
const query = searchParams.get("q");

// Navigation state
const navigation = useNavigation();
const isSubmitting = navigation.state === "submitting";

// Fetcher (non-navigation data mutations)
const fetcher = useFetcher();
fetcher.submit(formData, { method: "POST", action: "/api/users" });
```

## Error Boundaries

```tsx
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "users", element: <Users />, errorElement: <UserError /> },
    ],
  },
]);

function ErrorPage() {
  const error = useRouteError();
  return <div>Something went wrong: {error.message}</div>;
}
```

## Quick Reference: v6 to v7

| v6 (Do Not Use)                    | v7 (Use This)                          |
| ---------------------------------- | -------------------------------------- |
| `import from 'react-router-dom'`   | `import from 'react-router'`           |
| `json({ data })`                   | `return { data }` or `Response.json()` |
| `defer({ promise })`               | Return promise directly + Suspense     |
| `formMethod === 'post'`            | `formMethod === 'POST'`                |
| `react-router-dom` in package.json | `react-router` only                    |

---

## Need More Detail?

For full API reference, use: `/stack-docs react-router <topic>`
