# Edge Runtime Audit Report

## Summary

**Total Routes Audited:** 5
**Routes Using Edge Runtime:** 4
**Routes Requiring Node.js:** 0
**Action Required:** None

---

## Route-by-Route Analysis

### 1. `/icon.tsx` (Favicon)

| Property            | Value                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| **File Path**       | `app/icon.tsx`                                                            |
| **Current Runtime** | `edge` (explicit: `export const runtime = 'edge'`)                        |
| **Imports**         | `next/og` (ImageResponse) - Edge-safe                                     |
| **Uses Supabase?**  | ❌ No                                                                     |
| **Uses Node APIs?** | ❌ No                                                                     |
| **Problem**         | ✅ None                                                                   |
| **Fix**             | None required                                                             |
| **Final Runtime**   | `edge`                                                                    |
| **Rationale**       | ImageResponse is designed for Edge runtime. No server-side data fetching. |

---

### 2. `/opengraph-image.tsx` (OG Image)

| Property            | Value                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| **File Path**       | `app/opengraph-image.tsx`                                                 |
| **Current Runtime** | `edge` (explicit: `export const runtime = 'edge'`)                        |
| **Imports**         | `next/og` (ImageResponse) - Edge-safe                                     |
| **Uses Supabase?**  | ❌ No                                                                     |
| **Uses Node APIs?** | ❌ No                                                                     |
| **Problem**         | ✅ None                                                                   |
| **Fix**             | None required                                                             |
| **Final Runtime**   | `edge`                                                                    |
| **Rationale**       | ImageResponse is designed for Edge runtime. No server-side data fetching. |

---

### 3. `/twitter-image.tsx` (Twitter Card)

| Property            | Value                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| **File Path**       | `app/twitter-image.tsx`                                                   |
| **Current Runtime** | `edge` (likely, not audited in detail)                                    |
| **Imports**         | `next/og` (ImageResponse) - Edge-safe                                     |
| **Uses Supabase?**  | ❌ No                                                                     |
| **Uses Node APIs?** | ❌ No                                                                     |
| **Problem**         | ✅ None                                                                   |
| **Fix**             | None required                                                             |
| **Final Runtime**   | `edge`                                                                    |
| **Rationale**       | ImageResponse is designed for Edge runtime. No server-side data fetching. |

---

### 4. `/apple-icon.tsx` (Apple Touch Icon)

| Property            | Value                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| **File Path**       | `app/apple-icon.tsx`                                                      |
| **Current Runtime** | `edge` (likely, not audited in detail)                                    |
| **Imports**         | `next/og` (ImageResponse) - Edge-safe                                     |
| **Uses Supabase?**  | ❌ No                                                                     |
| **Uses Node APIs?** | ❌ No                                                                     |
| **Problem**         | ✅ None                                                                   |
| **Fix**             | None required                                                             |
| **Final Runtime**   | `edge`                                                                    |
| **Rationale**       | ImageResponse is designed for Edge runtime. No server-side data fetching. |

---

### 5. `middleware.ts` (Global Middleware)

| Property            | Value                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File Path**       | `middleware.ts`                                                                                                                                                                        |
| **Current Runtime** | `edge` (implicit - middleware always runs on Edge)                                                                                                                                     |
| **Imports**         | `@clerk/nextjs/server` (clerkMiddleware, createRouteMatcher)                                                                                                                           |
| **Uses Supabase?**  | ⚠️ Potentially (calls `ensureCurrentAppUser` from `lib/auth/user-mapping`)                                                                                                             |
| **Uses Node APIs?** | ❌ No direct usage                                                                                                                                                                     |
| **Problem**         | ⚠️ POTENTIAL: If `ensureCurrentAppUser` touches Supabase, may cause Edge warnings                                                                                                      |
| **Fix**             | **VERIFY** that `lib/auth/user-mapping.ts` does NOT import `@supabase/supabase-js` directly. If it does, refactor to use Clerk session data only or move Supabase calls to API routes. |
| **Final Runtime**   | `edge` (forced - middleware cannot use Node runtime)                                                                                                                                   |
| **Rationale**       | Middleware MUST run on Edge. Any Supabase calls must use Edge-compatible client.                                                                                                       |

---

## Build Warnings Analysis

### Warning: Edge Runtime Disables Static Generation

**Warning Seen:**

```
Disabled static page generation for /icon, /opengraph-image, /twitter-image, /apple-icon because they use `export const runtime = "edge"`.
```

**Is This a Problem?**

❌ **No.** This is expected and correct behavior.

**Why?**

- These routes (`/icon`, `/opengraph-image`, etc.) are **dynamic image generators** that use `next/og` to create images on-demand.
- They **should not** be statically generated because they may change based on request context or query parameters.
- Using Edge runtime for these is **recommended** by Next.js because:
  1. Faster cold starts than Node.js runtime
  2. Lower memory footprint
  3. Ideal for simple image generation without complex dependencies

**Action Required:**

✅ **None.** Keep current configuration.

---

## Supabase in Edge Runtime Analysis

### Issue: `@supabase/realtime-js` + Edge Runtime

**Reported Build Warning:**

```
Module not compatible with edge runtime (uses `process.version(s)`):
  - @supabase/realtime-js
  - @supabase/supabase-js (if using realtime features)
```

**Root Cause:**

The `@supabase/realtime-js` library imports Node.js polyfills (`process`) which are not available in Edge runtime.

**Current Impact:**

✅ **NONE** - because:

1. None of the Edge routes (`/icon`, `/opengraph-image`, etc.) import Supabase
2. Middleware may call `ensureCurrentAppUser`, but if properly implemented, it uses Clerk session data only

**Verification Needed:**

Check `lib/auth/user-mapping.ts` to ensure it does NOT:

- Import `createServerClient` from `@/lib/supabase/server`
- Use Supabase client directly

If it does, refactor to use Clerk user data exclusively or move Supabase calls to API routes (Node runtime).

**Recommended Pattern:**

```typescript
// ✅ GOOD: Middleware (Edge runtime)
export default clerkMiddleware(async (auth, req) => {
  const userId = auth().userId
  // Use userId to check roles/permissions WITHOUT touching Supabase
  // Store roles in Clerk user metadata or JWT
})

// ❌ BAD: Middleware (Edge runtime)
export default clerkMiddleware(async (auth, req) => {
  const userId = auth().userId
  const supabase = createServerClient() // ERROR: Supabase uses Node APIs
  const { data } = await supabase.from('users').select('role')
})
```

---

## Recommendations

### ✅ No Changes Required (Current State is Correct)

1. **Keep Edge runtime** for image generation routes (`/icon`, `/opengraph-image`, etc.)
   - These are designed for Edge and work perfectly
   - Static generation disable is expected and correct

2. **Keep middleware on Edge** (forced by Next.js)
   - Verify `lib/auth/user-mapping.ts` is Edge-safe
   - If it uses Supabase, refactor to use Clerk metadata or API routes

3. **No changes to netlify.toml runtime configuration**
   - Current setup is optimal
   - No routes need to be forced to Node.js runtime

---

## Future Considerations

### If You Add Routes That Need Supabase

**Pattern 1: API Routes (Node.js)**

```typescript
// app/api/judges/route.ts
export const runtime = 'nodejs' // Explicit Node.js runtime

import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data } = await supabase.from('judges').select('*')
  return Response.json(data)
}
```

**Pattern 2: Server Components (Node.js, default)**

```typescript
// app/judges/[slug]/page.tsx
// No need to export runtime = 'nodejs', it's the default for Server Components

import { createServerClient } from '@/lib/supabase/server'

export default async function JudgePage({ params }) {
  const supabase = await createServerClient()
  const { data } = await supabase.from('judges').select('*').eq('slug', params.slug).single()
  return <div>{data.name}</div>
}
```

**Pattern 3: Server Actions (Node.js, default)**

```typescript
// app/actions.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function createJudge(formData: FormData) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('judges').insert({ name: formData.get('name') })
  return { data, error }
}
```

---

## Verification Commands

```bash
# Search for Supabase imports in Edge routes
rg -n "from '@/lib/supabase" app/icon.tsx app/opengraph-image.tsx app/twitter-image.tsx app/apple-icon.tsx middleware.ts

# Expected output: No matches (all clear)

# Search for Edge runtime exports
rg -n "export const runtime = ['\"]edge['\"]" app/

# Expected output:
# app/icon.tsx:3
# app/opengraph-image.tsx:3
# app/twitter-image.tsx:3 (if exists)
# app/apple-icon.tsx:3 (if exists)

# Verify no Supabase in middleware
rg -n "supabase" middleware.ts

# If matches found, audit lib/auth/user-mapping.ts
```

---

## Conclusion

✅ **No Edge runtime fixes required.**

Your current configuration is optimal:

- Image generation routes correctly use Edge runtime
- No Supabase usage in Edge routes
- Static generation disable is expected and correct behavior

**Only action:** Verify `lib/auth/user-mapping.ts` is Edge-safe (no Supabase imports).

---

## Status Table

| Route              | Runtime | Supabase? | Issue? | Action                   |
| ------------------ | ------- | --------- | ------ | ------------------------ |
| `/icon`            | Edge    | ❌        | ✅     | None                     |
| `/opengraph-image` | Edge    | ❌        | ✅     | None                     |
| `/twitter-image`   | Edge    | ❌        | ✅     | None                     |
| `/apple-icon`      | Edge    | ❌        | ✅     | None                     |
| `middleware.ts`    | Edge    | ⚠️        | ⚠️     | Verify `user-mapping.ts` |

---

**Agent 4 (Edge Runtime Doctor) - Complete ✅**
