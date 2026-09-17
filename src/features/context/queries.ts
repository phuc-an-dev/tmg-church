import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import { isUuid } from "@/lib/slug";

/**
 * Resolved operational context for the single active church.
 * Every protected query and mutation should start from this context.
 */
export type OperationalContext = {
  leader: { userId: string; email: string };
  church: { id: string; name: string; slug: string };
};

export type MinistryOperationalContext = OperationalContext & {
  ministry: {
    id: string;
    name: string;
    slug: string;
    accentColor: string;
    iconKey: string;
  };
};

export type TermOperationalContext = MinistryOperationalContext & {
  term: {
    id: string;
    name: string;
    slug: string;
    startDate: string | null;
    endDate: string | null;
    lifecycle: "draft" | "active" | "closed";
  };
};

export type DepartmentOperationalContext = TermOperationalContext & {
  department: {
    id: string;
    name: string;
    slug: string;
    accentColor: string;
    iconKey: string;
  };
};

export type GroupOperationalContext = TermOperationalContext & {
  group: {
    id: string;
    name: string;
    slug: string;
    accentColor: string;
    iconKey: string;
  };
};

/**
 * Resolves the authenticated leader and single active church.
 *
 * - Redirects to `/admin/login` if unauthenticated.
 * - Redirects to `/admin/unauthorized` if not a leader.
 * - Redirects to `/admin/church` when zero churches exist.
 * - Throws when multiple churches exist (data corruption guard).
 *
 * Wrapped in React cache() to deduplicate within a single request.
 */
export const requireOperationalContext = cache(
  async (): Promise<OperationalContext> => {
    const auth = await requireLeader();
    const supabase = await createClient();

    const { data: churches, error } = await supabase
      .from("church")
      .select("id, name, slug")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error("Failed to fetch church records");
    }

    if (!churches || churches.length === 0) {
      redirect("/admin/church");
    }

    if (churches.length > 1) {
      throw new Error(
        "Multiple churches exist in the database. Multi-church switching is not supported.",
      );
    }

    const church = churches[0];

    return {
      leader: { userId: auth.leader.user_id, email: auth.email },
      church: { id: church.id, name: church.name, slug: church.slug },
    };
  },
);

/**
 * Resolves operational context with a specific ministry.
 *
 * @param slug - Ministry's immutable Church-scoped slug.
 * @returns The ministry context, or `null` if the ministry is not found.
 */
export const requireMinistryContext = cache(
  async (slug: string): Promise<MinistryOperationalContext | null> => {
    if (isUuid(slug)) return null;
    const ctx = await requireOperationalContext();
    const supabase = await createClient();

    let query = supabase
      .from("ministry")
      .select("id, name, slug, accent_color, icon_key")
      .eq("church_id", ctx.church.id);

    query = query.eq("slug", slug);

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error("Failed to fetch ministry context");
    }

    return data
      ? {
          ...ctx,
          ministry: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            accentColor: data.accent_color,
            iconKey: data.icon_key,
          },
        }
      : null;
  },
);

/**
 * Resolves operational context with a specific ministry and term.
 *
 * @param ministrySlug - Ministry's immutable Church-scoped slug.
 * @param termSlug - Term's immutable ministry-scoped slug.
 * @returns The full term context, or `null` if ministry or term is not found.
 */
export const requireTermContext = cache(
  async (
    ministrySlug: string,
    termSlug: string,
  ): Promise<TermOperationalContext | null> => {
    if (isUuid(ministrySlug) || isUuid(termSlug)) return null;
    const ministryCtx = await requireMinistryContext(ministrySlug);
    if (!ministryCtx) return null;

    const supabase = await createClient();

    let query = supabase
      .from("ministry_term")
      .select("id, name, slug, start_date, end_date, lifecycle")
      .eq("ministry_id", ministryCtx.ministry.id);

    query = query.eq("slug", termSlug);

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error("Failed to fetch term context");
    }

    return data
      ? {
          ...ministryCtx,
          term: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            startDate: data.start_date,
            endDate: data.end_date,
            lifecycle: data.lifecycle,
          },
        }
      : null;
  },
);

/**
 * Resolves operational context with a specific ministry, term, and department.
 *
 * @param ministrySlug - Ministry's immutable Church-scoped slug.
 * @param termSlug - Term's immutable ministry-scoped slug.
 * @param departmentSlug - Department's immutable term-scoped slug.
 * @returns The full department context, or `null` if ministry, term, or department is not found.
 */
export const requireDepartmentContext = cache(
  async (
    ministrySlug: string,
    termSlug: string,
    departmentSlug: string,
  ): Promise<DepartmentOperationalContext | null> => {
    if (isUuid(ministrySlug) || isUuid(termSlug) || isUuid(departmentSlug)) {
      return null;
    }
    const termCtx = await requireTermContext(ministrySlug, termSlug);
    if (!termCtx) return null;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("term_department")
      .select("id, name, slug, accent_color, icon_key")
      .eq("ministry_term_id", termCtx.term.id)
      .eq("slug", departmentSlug)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to fetch department context");
    }

    return data
      ? {
          ...termCtx,
          department: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            accentColor: data.accent_color,
            iconKey: data.icon_key,
          },
        }
      : null;
  },
);

/**
 * Resolves operational context with a specific ministry, term, and group.
 *
 * @param ministrySlug - Ministry's immutable Church-scoped slug.
 * @param termSlug - Term's immutable ministry-scoped slug.
 * @param groupSlug - Group's immutable term-scoped slug.
 * @returns The full group context, or `null` if ministry, term, or group is not found.
 */
export const requireGroupContext = cache(
  async (
    ministrySlug: string,
    termSlug: string,
    groupSlug: string,
  ): Promise<GroupOperationalContext | null> => {
    if (isUuid(ministrySlug) || isUuid(termSlug) || isUuid(groupSlug)) {
      return null;
    }
    const termCtx = await requireTermContext(ministrySlug, termSlug);
    if (!termCtx) return null;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("term_group")
      .select("id, name, slug, accent_color, icon_key")
      .eq("ministry_term_id", termCtx.term.id)
      .eq("slug", groupSlug)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to fetch group context");
    }

    return data
      ? {
          ...termCtx,
          group: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            accentColor: data.accent_color,
            iconKey: data.icon_key,
          },
        }
      : null;
  },
);
