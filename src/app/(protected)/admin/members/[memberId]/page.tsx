import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getMemberDetail,
  getMemberDetailOptions,
} from "@/features/member/queries";
import { MemberDetail } from "@/features/member/components/member-detail";

export const metadata: Metadata = { title: "Member Details" };

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const detail = await getMemberDetail(memberId);
  if (!detail) notFound();

  const activeTermIds = detail.memberships.map((m) => m.termId);
  const options = await getMemberDetailOptions(activeTermIds);

  return <MemberDetail initialData={detail} options={options} />;
}
