import { NextResponse } from "next/server";

export type RefinementErrorCode =
  | "AUTH_REQUIRED"
  | "NOT_OWNER"
  | "INVALID_SNAPSHOT"
  | "NOT_LATEST_SNAPSHOT"
  | "CATALOG_EXHAUSTED"
  | "INVALID_SESSION"
  | "INVALID_ANSWER"
  | "INCOMPATIBLE_SCORING_VERSION"
  | "INTERNAL_ERROR";

export class RefinementError extends Error {
  constructor(
    public readonly code: RefinementErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function refinementErrorResponse(error: unknown, fallback: string) {
  if (error instanceof RefinementError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error("Living EraPrint API failure", error);
  return NextResponse.json(
    { error: fallback, code: "INTERNAL_ERROR" satisfies RefinementErrorCode },
    { status: 500 },
  );
}
