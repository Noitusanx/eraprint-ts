import { RefineClient } from "@/components/refine-client";

export default async function RefinePage({ params }: {
  params: Promise<{ snapshotId: string }>;
}) {
  const { snapshotId } = await params;
  return <RefineClient snapshotId={snapshotId} />;
}
