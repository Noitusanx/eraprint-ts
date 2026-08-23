import { ImageResponse } from "next/og";
import { CircleShareCard } from "@/lib/share/social-share-cards";
import { fetchPublicCircleResult } from "@/lib/repositories/circle-public-repository";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";
import type { PublicCircleResult } from "@/lib/circle/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let result: PublicCircleResult;
  let viewerMemberIndex: number | null;
  try {
    const body = (await request.json()) as { resultId?: string; viewerMemberIndex?: number | null };
    if (!body.resultId || !UUID_PATTERN.test(body.resultId)) throw new Error("A valid Circle result ID is required.");
    const fetched = await fetchPublicCircleResult(body.resultId);
    if (!fetched) throw new Error("Circle result not found.");
    result = fetched;
    viewerMemberIndex = Number.isInteger(body.viewerMemberIndex) && Number(body.viewerMemberIndex) > 0 ? Number(body.viewerMemberIndex) : null;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to generate Circle card." }, { status: 400 });
  }
  return new ImageResponse(<CircleShareCard result={result} viewerMemberIndex={viewerMemberIndex} />, { width: 1080, height: 1920 });
}
