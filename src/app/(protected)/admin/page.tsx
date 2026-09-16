import type { Metadata } from "next";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MemberManagement } from "@/features/member/components/member-management";
import { getMemberForEdit, getMembers } from "@/features/member/queries";
import { memberSearchParamsCache } from "@/features/member/search-params";
import { getSegments } from "@/features/segment/queries";

export const metadata: Metadata = {
  title: "Members",
  description: "Manage TMG Church member profiles",
};

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = await memberSearchParamsCache.parse(searchParams);
  const safePage = Math.max(1, params.page);
  const [result, editedMember, segments] = await Promise.all([
    getMembers({ ...params, segmentSlug: params.segment, page: safePage }),
    params.edit ? getMemberForEdit(params.edit) : Promise.resolve(null),
    getSegments(),
  ]);

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Members"
        description="Manage member profiles and directory for TMG Church."
      />
      <MemberManagement
        result={result}
        editedMember={editedMember}
        requestedEditId={params.edit}
        invalidEdit={Boolean(params.edit && !editedMember)}
        segments={segments}
      />
    </AdminPageContainer>
  );
}
