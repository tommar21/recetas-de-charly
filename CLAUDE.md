# Recetas de Charly - Development Guide

## Project Overview

Recipe sharing app built with Next.js 15 (App Router), Supabase, and shadcn/ui.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Language**: TypeScript
- **Forms**: React Hook Form + Zod (when needed)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register)
│   ├── recipes/           # Recipe pages
│   └── layout.tsx         # Root layout (fetches user SSR)
├── components/
│   ├── layout/            # Header, Footer
│   ├── recipes/           # Recipe-specific components
│   └── ui/                # shadcn/ui components
├── lib/                   # Everything else (utilities, hooks, types)
│   ├── actions/           # ServerActions pattern + types
│   ├── auth/              # Auth utilities (get-user.ts)
│   ├── hooks/             # React hooks
│   ├── supabase/          # Supabase clients (client.ts, server.ts)
│   ├── types/             # TypeScript types (database, actions)
│   └── utils/             # General utilities (cn.ts)
└── middleware.ts          # Next.js middleware
```

**Arquitectura de 3 carpetas principales:**
- `app/` - Paginas y rutas
- `components/` - Componentes React
- `lib/` - Todo lo demas (hooks, types, utils, supabase, actions)

---

## Data Fetching Patterns

### 1. SSR with `getUser()` - For Auth State

User authentication is fetched server-side in the root layout and passed to components.

```tsx
// src/app/layout.tsx
import { getUser } from '@/lib/auth/get-user'

export default async function RootLayout({ children }) {
  const user = await getUser()
  return (
    <Header initialUser={user} />
  )
}
```

**When to use**: Always use this pattern for auth state to avoid client-side loading flashes.

### 2. ServerActions Component - For Multiple Parallel Fetches

Use `ServerActions` when a page needs to fetch multiple pieces of data in parallel with error handling.

```tsx
// src/app/recipes/[slug]/page.tsx
import { ServerActions } from '@/lib/actions'

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  return (
    <ServerActions
      actions={{
        recipe: {
          action: () => getRecipe(slug),
        },
        comments: {
          action: () => getComments(slug),
          defaultValue: [], // Fallback if fetch fails
        },
        related: {
          action: () => getRelatedRecipes(slug),
          defaultValue: [],
        },
      }}
    >
      {(data, { errors }) => (
        <RecipeDetail
          recipe={data.recipe}
          comments={data.comments}
          related={data.related}
        />
      )}
    </ServerActions>
  )
}
```

**When to use**:
- Page needs 2+ data fetches
- Want parallel execution
- Need automatic error toasts
- Want fallback values on failure

**When NOT to use**:
- Single data fetch (just use regular async/await)
- Simple pages without error handling needs

### 3. useServerAction Hook - For Client-Side Mutations

Use for forms, button actions, and any client-side mutations.

```tsx
'use client'

import { useServerAction } from '@/lib/hooks'

function DeleteButton({ recipeId }: { recipeId: string }) {
  const { execute, isLoading } = useServerAction()

  const handleDelete = async () => {
    const success = await execute(
      () => deleteRecipeAction(recipeId),
      {
        messageSuccess: 'Receta eliminada!',
        messageError: 'No se pudo eliminar la receta',
        onSuccess: () => router.push('/recipes'),
      }
    )
  }

  return (
    <Button onClick={handleDelete} disabled={isLoading}>
      {isLoading ? 'Eliminando...' : 'Eliminar'}
    </Button>
  )
}
```

**Options**:
- `messageSuccess`: Toast message on success
- `messageError`: Toast message on error (set to `null` to disable)
- `onSuccess`: Callback with data
- `onError`: Callback with error details
- `onFinally`: Always runs after action

---

## Server Action Return Type

All server actions MUST return `ServerActionResult<T>`:

```tsx
import type { ServerActionResult } from '@/lib/actions'

export async function createRecipeAction(data: FormData): Promise<ServerActionResult<Recipe>> {
  try {
    const recipe = await db.recipes.create(data)
    return { success: true, data: recipe }
  } catch (error) {
    return {
      success: false,
      error: 'No se pudo crear la receta',
      errorCode: 'VALIDATION_ERROR', // Optional
      statusCode: 400, // Optional
    }
  }
}
```

**Error codes** (automatically translated to Spanish):
- `NOT_FOUND` - "No se encontro el recurso solicitado"
- `UNAUTHORIZED` - "No tienes permiso para realizar esta accion"
- `FORBIDDEN` - "Acceso denegado"
- `VALIDATION_ERROR` - "Los datos proporcionados no son validos"
- `NETWORK_ERROR` - "Error de conexion. Verifica tu internet"
- `SERVER_ERROR` - "Error del servidor. Intenta de nuevo mas tarde"

---

## Supabase Clients

### Server Components
```tsx
import { createClient } from '@/lib/supabase/server'

async function getData() {
  const supabase = await createClient()
  if (!supabase) return null

  const { data } = await supabase.from('recipes').select('*')
  return data
}
```

### Client Components
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'

function Component() {
  const supabase = createClient()
  // Use for real-time subscriptions, auth state changes
}
```

---

## Import Paths Reference

| What | Import From |
|------|-------------|
| Database types | `@/lib/types` |
| ServerActionResult | `@/lib/types` or `@/lib/actions` |
| useServerAction | `@/lib/hooks` |
| ServerActions component | `@/lib/actions` |
| Supabase server client | `@/lib/supabase/server` |
| Supabase browser client | `@/lib/supabase/client` |
| getUser (SSR auth) | `@/lib/auth/get-user` |
| cn (Tailwind utility) | `@/lib/utils` |

---

## Component Conventions

### File Naming
- Components: `kebab-case.tsx` (e.g., `recipe-card.tsx`)
- Pages: `page.tsx` in route folders
- Layouts: `layout.tsx`

### Component Structure
```tsx
// 1. Imports
import { ... } from '...'

// 2. Types (if component-specific)
interface Props { ... }

// 3. Component
export function ComponentName({ prop1, prop2 }: Props) {
  // Hooks first
  const [state, setState] = useState()

  // Handlers
  const handleClick = () => { ... }

  // Render
  return (...)
}
```

### Client vs Server Components
- Default to Server Components
- Add `'use client'` only when needed:
  - useState, useEffect, useContext
  - Event handlers (onClick, onChange)
  - Browser APIs
  - Third-party client libraries

---

## Styling

Using Tailwind CSS v4. Container centering:

```tsx
// Correct - use classes directly
<div className="container mx-auto max-w-7xl px-4">

// Incorrect - @apply in CSS doesn't work reliably in v4
```

---

## Language

- UI text: Spanish (no accents in code strings for compatibility)
- Code/comments: English
- Variable names: English

---

## Common Tasks

### Adding a New Page
1. Create route folder in `src/app/`
2. Add `page.tsx`
3. If needs auth, check user in server component or use middleware

### Adding a Server Action
1. Create action file in `src/app/actions/` or colocate with page
2. Return `ServerActionResult<T>`
3. Use `useServerAction` hook in client or `ServerActions` in server

### Adding a Database Table
1. Create migration in `supabase/migrations/`
2. Update types in `src/lib/types/database.ts`
3. Add RLS policies

---

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```
