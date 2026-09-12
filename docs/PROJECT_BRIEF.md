# Project brief

## Product

TMG Church is a church information and management application deployed at `https://tmgchurch.website`.

It serves two audiences:

1. Public members can view a reduced directory, announcements, and schedules without signing in.
2. Leaders authenticate by Supabase Magic Link and manage church data according to Row Level Security.

The initial data set is approximately 90 youth ministry members. The architecture must support additional ministries, terms, groups, departments, sessions, attendance, service rosters, and care workflows without being hard-coded to the current group size.

## Language policy

All implementation, developer material, and product content are English.

Initial product copy direction:

- Product name: `TMG Church`
- Public directory heading: `Members Directory`
- Search placeholder: `Search by name`
- Administration label: `Administration`
- Sign-in label: `Leader Sign In`

The default product brand is "TMG Church". User-entered database values must be displayed verbatim. Vietnamese names remain supported by the slug generator.

## Confirmed requirements

- Next.js App Router and TypeScript
- Supabase Postgres, Auth, and RLS with no separate backend
- Supabase Magic Link authentication with one initial leader email
- Vercel deployment and the `tmgchurch.website` production domain
- Mobile-first responsive design
- White default theme, black dark theme, blue primary accent
- shadcn/ui components and Lucide icons
- No emoji
- Custom dropdowns; searchable combobox from five items onward
- 300 ms debounced search
- URL-managed query state with `nuqs`
- Friendly slugs
- Server pagination and bounded DOM size
- Skeleton loading states
- Mobile cards and bottom drawers
- Form control text of at least 16 px on mobile
- Member archive and restore instead of hard deletion
- Direct form entry; no file import in the MVP

## First delivery boundary

The database migration covers the complete agreed schema. Application delivery is incremental:

1. Foundation and database
2. Authentication and leader authorization
3. Church and ministry structure administration
4. Member administration and assignments
5. Public member directory
6. Session, attendance, roster, and care workflows in later product phases

The first administration milestone supports one active church in the UI. Database ownership remains explicit so multi-church UI support can be added later.

## Success criteria

- A non-leader cannot access or mutate private base-table data.
- An anonymous user can access only approved public view fields.
- A leader can manage the active church, ministries, terms, groups, departments, members, and assignments for the implemented slice.
- Archived members disappear from the public directory and can be restored by a leader.
- Search, filters, and pagination are shareable through the URL.
- The primary administration flows work comfortably on an iPhone-sized viewport without focus zoom or oversized DOM output.
