type StructuredError = {
  code?: unknown;
  message?: unknown;
};

export function safeSupabaseError(
  error: unknown,
  fallback: string,
): string {
  if (error && typeof error === "object") {
    const structured = error as StructuredError;

    if (structured.code === "PGRST202") {
      return "This feature is not available until its database migration is applied.";
    }

    if (typeof structured.message === "string") {
      const allowedMessages = [
        "Authentication is required.",
        "Snapshot not found or not owned by this session.",
        "Joining snapshot not found or not owned by this session.",
        "Match invite not found.",
        "This match invite has expired.",
        "An EraPrint cannot match with itself.",
        "Both snapshots must contain eight persisted traits.",
        "The owner snapshot must contain eight persisted traits.",
        "The owner snapshot must contain all twelve Era percentages.",
        "Circle not found.",
        "This Circle has already been finalized.",
        "This Circle invite has expired.",
        "This EraPrint uses an incompatible scoring version.",
        "Joining snapshot must contain eight persisted traits.",
        "Joining snapshot must contain all twelve Era percentages.",
        "This session has already joined the Circle.",
        "This Circle already has 10 members.",
        "Only the Circle creator can reveal the result.",
        "Circle requires at least 3 members before reveal.",
        "Circle cannot exceed 10 members.",
        "Circle members use incompatible scoring versions.",
        "Every Circle member must contain eight persisted traits.",
        "Every Circle member must contain all twelve Era percentages.",
      ];

      if (allowedMessages.includes(structured.message)) {
        return structured.message;
      }
    }
  }

  return error instanceof Error ? error.message : fallback;
}
