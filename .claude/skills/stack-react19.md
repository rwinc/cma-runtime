# React 19 — Correct Patterns

> TRIGGER: code imports `react`, `react-dom`, or uses JSX/TSX components.
> Richwood baseline: react ^19.0.0
> These patterns supersede React 18. Do not generate React 18 patterns.

## ref as Regular Prop (forwardRef Deprecated)

```tsx
// WRONG — forwardRef is deprecated in React 19
const MyInput = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input ref={ref} {...props} />;
});

// CORRECT — ref is a regular prop
function MyInput({
  placeholder,
  ref,
}: {
  placeholder: string;
  ref?: React.Ref<HTMLInputElement>;
}) {
  return <input ref={ref} placeholder={placeholder} />;
}

// Usage unchanged
<MyInput ref={myRef} placeholder="Type here" />;
```

`forwardRef` still works but will be removed in a future version. Write all new code without it.

## useActionState (replaces useFormState)

```tsx
// WRONG — useFormState from react-dom is deprecated
import { useFormState } from "react-dom";

// CORRECT — useActionState from react
import { useActionState } from "react";

const [state, submitAction, isPending] = useActionState(
  async (previousState, formData) => {
    const error = await updateName(formData.get("name"));
    if (error) return { error };
    return { success: true };
  },
  null, // initial state
);

// Use in JSX
<form action={submitAction}>
  <input name="name" />
  <button disabled={isPending}>Save</button>
  {state?.error && <p>{state.error}</p>}
</form>;
```

Returns 3 values: `[state, formAction, isPending]`.

## Context as Provider (no .Provider needed)

```tsx
// WRONG — .Provider is deprecated in React 19
<ThemeContext.Provider value="dark">
  {children}
</ThemeContext.Provider>

// CORRECT — render Context directly
<ThemeContext value="dark">
  {children}
</ThemeContext>
```

`<Context.Provider>` still works but will be deprecated.

## use() Hook

`use()` reads Promises and Context. Unlike `useContext`, it works inside conditionals and loops.

```tsx
import { use, Suspense } from "react";

// Reading context (can be conditional)
function Heading({ show }: { show: boolean }) {
  if (!show) return null;
  const theme = use(ThemeContext); // OK inside conditional
  return <h1 style={{ color: theme.color }}>Hello</h1>;
}

// Reading promises (suspends until resolved)
function Comments({
  commentsPromise,
}: {
  commentsPromise: Promise<Comment[]>;
}) {
  const comments = use(commentsPromise);
  return comments.map((c) => <p key={c.id}>{c.text}</p>);
}

// Wrap in Suspense
<Suspense fallback={<Loading />}>
  <Comments commentsPromise={fetchComments()} />
</Suspense>;
```

## Form Actions

```tsx
// React 19 supports action on <form>
function SignupForm() {
  async function signup(formData: FormData) {
    "use server"; // or handle client-side
    const email = formData.get("email");
    await createAccount(email);
  }

  return (
    <form action={signup}>
      <input name="email" type="email" />
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

## useOptimistic

```tsx
import { useOptimistic } from "react";

function TodoList({ todos, addTodoAction }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { ...newTodo, pending: true }],
  );

  return (
    <form
      action={async (formData) => {
        const title = formData.get("title");
        addOptimisticTodo({ title, id: "temp" });
        await addTodoAction(title);
      }}
    >
      {optimisticTodos.map((todo) => (
        <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
          {todo.title}
        </li>
      ))}
      <input name="title" />
      <button>Add</button>
    </form>
  );
}
```

## Quick Reference: Old vs. New

| React 18 (Do Not Use)                      | React 19 (Use This)                            |
| ------------------------------------------ | ---------------------------------------------- |
| `React.forwardRef((props, ref) => ...)`    | `function Comp({ ref, ...props })`             |
| `import { useFormState } from 'react-dom'` | `import { useActionState } from 'react'`       |
| `<Ctx.Provider value={x}>`                 | `<Ctx value={x}>`                              |
| `useContext(Ctx)` (only top-level)         | `use(Ctx)` (works in conditionals)             |
| Manual optimistic state                    | `useOptimistic(state, updater)`                |
| `<title>` in `<Helmet>`                    | `<title>` anywhere in component tree (hoisted) |

## Metadata in Components (Document metadata)

React 19 natively hoists `<title>`, `<meta>`, and `<link>` tags:

```tsx
function BlogPost({ post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.summary} />
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

No need for `react-helmet` or similar libraries.

---

## Need More Detail?

For full API reference, use: `/stack-docs react <topic>`
