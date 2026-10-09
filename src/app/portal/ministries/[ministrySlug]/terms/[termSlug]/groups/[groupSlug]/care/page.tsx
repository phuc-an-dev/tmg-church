import { notFound } from "next/navigation";
import { getCareList } from "@/features/care/queries";
import { careSearchParamsCache } from "@/features/care/search-params";
import { CareList } from "@/features/care/components/care-list";

export default async function GroupCarePage({
  params,
  searchParams,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    groupSlug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ministrySlug, termSlug, groupSlug } = await params;
  const filters = await careSearchParamsCache.parse(searchParams);
  const data = await getCareList(ministrySlug, termSlug, {
    groupSlug,
    tab: filters.tab,
    page: filters.page,
    q: filters.q,
  });
  if (!data) notFound();
  return <CareList data={data} fixedGroup />;
}
