import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import { getActiveChurch } from "@/features/church/queries";
import { MEMBER_PAGE_SIZE, normalizeMemberSearch } from "./search-params";
import { memberIdSchema } from "./schemas";
import type { MemberItem, MemberPageResult } from "./types";

function pageRange(page: number) {
  const current = Math.max(1, page);
  return {
    current,
    from: (current - 1) * MEMBER_PAGE_SIZE,
    to: current * MEMBER_PAGE_SIZE - 1,
  };
}

function toMemberItem(row: {
  id: string;
  full_name: string;
  phone: string | null;
  birth_year: number | null;
}): MemberItem {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    birthYear: row.birth_year,
  };
}

export async function getMembers(params: {
  q: string;
  sort: "full_name" | "birth_year";
  order: "asc" | "desc";
  page: number;
}): Promise<MemberPageResult> {
  await requireLeader();
  const church = await getActiveChurch();

  if (!church) {
    return {
      items: [],
      count: 0,
      page: 1,
      pageSize: MEMBER_PAGE_SIZE,
    };
  }

  const supabase = await createClient();
  const q = normalizeMemberSearch(params.q);
  let countQuery = supabase
    .from("member_profile")
    .select("id", { count: "exact", head: true })
    .eq("church_id", church.id)
    .is("archived_at", null);

  if (q) {
    countQuery = countQuery.ilike("full_name", `%${q}%`);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error("Failed to fetch members");
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / MEMBER_PAGE_SIZE));
  const requestedPage = pageRange(params.page).current;
  const page = Math.min(requestedPage, totalPages);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("member_profile")
    .select("id, full_name, phone, birth_year")
    .eq("church_id", church.id)
    .is("archived_at", null);

  if (q) {
    query = query.ilike("full_name", `%${q}%`);
  }

  const { data, error } = await query
    .order(params.sort, {
      ascending: params.order === "asc",
      nullsFirst: false,
    })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error("Failed to fetch members");
  }

  return {
    items: (data ?? []).map(toMemberItem),
    count: count ?? 0,
    page,
    pageSize: MEMBER_PAGE_SIZE,
  };
}

export async function getMemberForEdit(
  memberId: string,
): Promise<MemberItem | null> {
  if (!memberIdSchema.safeParse(memberId).success) {
    return null;
  }

  await requireLeader();
  const church = await getActiveChurch();
  if (!church) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_profile")
    .select("id, full_name, phone, birth_year")
    .eq("id", memberId)
    .eq("church_id", church.id)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to fetch member");
  }

  return data ? toMemberItem(data) : null;
}
