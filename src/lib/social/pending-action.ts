export const PENDING_SOCIAL_ACTION_KEY = "eraprint:pendingSocialAction";
const LEGACY_MATCH_KEY = "eraprint:pendingMatchInvite";

export type PendingSocialAction =
  | { type: "match"; inviteId: string }
  | { type: "circle"; circleId: string };

export function setPendingSocialAction(action: PendingSocialAction): void {
  localStorage.setItem(PENDING_SOCIAL_ACTION_KEY, JSON.stringify(action));
  if (action.type === "match") localStorage.removeItem(LEGACY_MATCH_KEY);
}

export function getPendingSocialAction(): PendingSocialAction | null {
  const raw = localStorage.getItem(PENDING_SOCIAL_ACTION_KEY);
  if (raw) {
    try {
      const value = JSON.parse(raw) as Partial<PendingSocialAction>;
      if (value.type === "match" && typeof value.inviteId === "string") {
        return { type: "match", inviteId: value.inviteId };
      }
      if (value.type === "circle" && typeof value.circleId === "string") {
        return { type: "circle", circleId: value.circleId };
      }
    } catch {
      localStorage.removeItem(PENDING_SOCIAL_ACTION_KEY);
    }
  }

  const legacyMatchId = localStorage.getItem(LEGACY_MATCH_KEY);
  return legacyMatchId ? { type: "match", inviteId: legacyMatchId } : null;
}

export function clearPendingSocialAction(): void {
  localStorage.removeItem(PENDING_SOCIAL_ACTION_KEY);
  localStorage.removeItem(LEGACY_MATCH_KEY);
}
