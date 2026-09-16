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
 * @param identifier - Ministry UUID or slug.
 * @returns The ministry context, or `null` if the ministry is not found.
 */
export const requireMinistryContext = cache(
  async (identifier: string): Promise<MinistryOperationalContext | null> => {
    const ctx = await requireOperationalContext();
    const supabase = await createClient();

    let query = supabase
      .from("ministry")
      .select("id, name, slug, accent_color, icon_key")
      .eq("church_id", ctx.church.id);

    query = isUuid(identifier)
      ? query.eq("id", identifier)
      : query.eq("slug", identifier);

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
 * @param ministryIdentifier - Ministry UUID or slug.
 * @param termIdentifier - Term UUID or slug.
 * @returns The full term context, or `null` if ministry or term is not found.
 */
export const requireTermContext = cache(
  async (
    ministryIdentifier: string,
    termIdentifier: string,
  ): Promise<TermOperationalContext | null> => {
    const ministryCtx = await requireMinistryContext(ministryIdentifier);
    if (!ministryCtx) return null;

    const supabase = await createClient();

    let query = supabase
      .from("ministry_term")
      .select("id, name, slug, start_date, end_date, lifecycle")
      .eq("ministry_id", ministryCtx.ministry.id);

    query = isUuid(termIdentifier)
      ? query.eq("id", termIdentifier)
      : query.eq("slug", termIdentifier);

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
