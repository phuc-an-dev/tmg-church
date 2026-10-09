import { notFound } from "next/navigation";
import { getCareList } from "@/features/care/queries";
import { careSearchParamsCache } from "@/features/care/search-params";
import { CareList } from "@/features/care/components/care-list";

export default async function TermCarePage({
  params,
  searchParams,
}: {
  params: Promise<{ ministrySlug: string; termSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ministrySlug, termSlug } = await params;
  const filters = await careSearchParamsCache.parse(searchParams);
  const data = await getCareList(ministrySlug, termSlug, {
    groupSlug: filters.group,
    tab: filters.tab,
    page: filters.page,
    q: filters.q,
  });
  if (!data) notFound();
  return <CareList data={data} />;
}
