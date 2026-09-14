import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MemberManagement } from "@/features/member/components/member-management";
import { getMemberForEdit, getMembers } from "@/features/member/queries";
import { memberSearchParamsCache } from "@/features/member/search-params";

export const metadata: Metadata = {
  title: "Members",
  description: "Manage TMG Church member profiles",
};

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = await memberSearchParamsCache.parse(searchParams);
  const safePage = Math.max(1, params.page);
  const [result, editedMember] = await Promise.all([
    getMembers({ ...params, page: safePage }),
    params.edit ? getMemberForEdit(params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Members"
        description="Manage member profiles and directory for TMG Church."
      />
      <MemberManagement
        result={result}
        editedMember={editedMember}
        requestedEditId={params.edit}
        invalidEdit={Boolean(params.edit && !editedMember)}
      />
    </div>
  );
}
