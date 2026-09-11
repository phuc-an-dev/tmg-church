# Architecture

## Runtime shape

```text
Browser
  |-- public pages --------------------> public Supabase view
  |                                      anonymous publishable-key context
  |
  `-- authenticated administration ---> Next.js Server Components / Actions
                                         cookie-backed Supabase SSR context
                                                    |
                                                    `--> RLS-protected base tables
```

There is no separate application backend. Next.js server code coordinates rendering and mutations, while Postgres constraints and RLS remain the data authorization boundary.

## Suggested source structure

```text
src/
  app/
    (public)/
      page.tsx
      ministries/[ministrySlug]/terms/[termSlug]/
    admin/
      login/
      auth/callback/
      church/
      ministries/
      members/
    layout.tsx
  components/
    ui/
    shared/
    public/
    admin/
  features/
    auth/
    church/
    ministry/
    member/
  lib/
    supabase/
      public.ts
      client.ts
      server.ts
      middleware.ts
    env.ts
  types/
    database.ts
supabase/
  migrations/
```

Route groups are optional and must not change the required URLs.

## Supabase client boundaries

The requirement defines two trust contexts, but Next.js needs three small factories:

1. `public.ts` creates a non-session public client using the publishable key. It is restricted by convention to approved public views.
2. `client.ts` creates the browser session client with `createBrowserClient` for Magic Link initiation and interactive auth state.
3. `server.ts` creates the cookie-backed server client with `createServerClient` for Server Components, Server Actions, and callback exchange.

The second and third factories represent one authenticated trust context. They exist separately because browser and server cookie APIs differ.

## Authentication flow

1. A leader enters an email on `/admin/login`.
2. Supabase sends a Magic Link using PKCE.
3. Supabase redirects to `/admin/auth/callback?code=...&next=/admin`.
4. The callback validates `next` as a safe internal path and exchanges the code for a cookie-backed session.
5. The admin layout verifies the current user and checks leader authorization.
6. RLS independently permits or rejects each base-table query.

The production redirect origin is `https://tmgchurch.website`. Local development uses `http://localhost:3000`. Both must be configured in Supabase Auth redirect URLs.

## Public routing

- `/` presents church identity, the active ministry/term entry point, and clearly marked announcement or schedule placeholders until live modules exist.
- `/ministries/[ministrySlug]/terms/[termSlug]` presents the public member directory for one ministry term.
- Query parameters hold `q`, filters, sort, and `page`.
- Invalid slugs return a localized 404.

## Administration routing

- `/admin/login`
- `/admin`
- `/admin/church`
- `/admin/ministries`
- `/admin/ministries/[ministryId]/terms/[termId]`
- `/admin/members`
- `/admin/members/[memberId]`

Administration URLs may use immutable UUIDs because they are private operational routes. Public URLs use slugs.

## Reads and mutations

- Initial collection reads occur in Server Components using parsed URL state.
- Interactive controls update URL state through `nuqs`.
- Server-backed search uses `shallow: false` with a 300 ms debounce.
- Authenticated mutations use Server Actions and server-side Zod validation.
- Mutations revalidate only affected routes or cache tags.
- Multi-table writes that must succeed together use narrowly scoped Postgres functions with explicit grants.

## Deployment

- Vercel hosts Next.js.
- Supabase hosts Postgres and Auth.
- Production environment variables are configured in Vercel.
- Supabase Auth Site URL uses `https://tmgchurch.website`.
- Preview deployments need an explicit redirect strategy before Magic Link is enabled on previews.
