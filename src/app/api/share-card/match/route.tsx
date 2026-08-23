import { ImageResponse } from "next/og";
import { EraMatchShareCard } from "@/lib/share/social-share-cards";
import { fetchPublicMatchResult, UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";
import type { PublicEraMatchResult } from "@/lib/match/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let result: PublicEraMatchResult;
  let viewerSide: "A" | "B" | null;
  try {
    const body = (await request.json()) as { matchId?: string; viewerSide?: "A" | "B" | null };
    if (!body.matchId || !UUID_PATTERN.test(body.matchId)) throw new Error("A valid EraMatch result ID is required.");
    const fetched = await fetchPublicMatchResult(body.matchId);
    if (!fetched) throw new Error("EraMatch result not found.");
    result = fetched;
    viewerSide = body.viewerSide === "A" || body.viewerSide === "B" ? body.viewerSide : null;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to generate EraMatch card." }, { status: 400 });
  }
  return new ImageResponse(<EraMatchShareCard result={result} viewerSide={viewerSide} />, { width: 1080, height: 1920 });
}
