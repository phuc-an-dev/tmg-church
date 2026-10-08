import { AuthSkeleton } from "@/features/access/auth-skeleton";

export default function Loading() {
  return <AuthSkeleton variant="unauthorized" />;
}
