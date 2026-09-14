# TMG Church

TMG Church is a mobile-first church management application for public member information and authenticated leader administration. The production domain is `tmgchurch.website`.

Foundation, database, authentication, Church administration, and Ministry administration are complete. `docs/NEXT_AGENT_TASK.md` is the only source for the next authorized task.

## Stack

- Next.js App Router with TypeScript
- React and Tailwind CSS
- shadcn/ui with Radix primitives
- Lucide icons
- Supabase Postgres, Auth, Row Level Security, and `@supabase/ssr`
- `nuqs` for URL query state
- React Hook Form and Zod for forms and validation
- TanStack Table for the desktop administration table
- Vercel deployment
- pnpm

## Local setup

Requirements:

- Node.js 22.13 or newer
- pnpm 11 or newer

Install dependencies and create the local environment file:

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

The app is available at `http://localhost:3000`.

## Environment variables

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Only publishable browser credentials belong in `NEXT_PUBLIC_*` variables. Never add a Supabase service-role key to this application or expose it to the browser.

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

## Documentation

- [Project brief](docs/PROJECT_BRIEF.md)
- [Engineering rules](docs/ENGINEERING_RULES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database design](docs/DATABASE.md)
- [Security model](docs/SECURITY.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Next coding-agent task](docs/NEXT_AGENT_TASK.md)
- [Plan and review workflow](docs/WORKFLOW.md)
- [Review checklist](docs/REVIEW_CHECKLIST.md)
- [Decision log](docs/decisions/0001-foundation.md)
- [Review log](docs/reviews/REVIEW_LOG.md)

## Current scope

The first implementation sequence creates the complete database schema, authentication boundary, and administration shell. The first usable administration modules are Church, Ministry, Ministry Term, Term Group, and Term Department. Member management follows immediately after those structures because member assignment depends on them.

Public announcements and schedules may appear as clearly marked interface placeholders until their tables and workflows are implemented. They must not pretend to be live data.
