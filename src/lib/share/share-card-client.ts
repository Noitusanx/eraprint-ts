export type ShareCardRequest =
  | { kind: "personal"; snapshotId: string }
  | { kind: "personal"; answers: unknown[] }
  | { kind: "match"; matchId: string; viewerSide: "A" | "B" | null }
  | { kind: "circle"; resultId: string; viewerMemberIndex: number | null };

export function filenameSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function createShareCardFile(
  path: string,
  payload: ShareCardRequest,
  filename: string,
): Promise<File> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (payload.kind === "personal" && "snapshotId" in payload) {
    const supabase = getSupabaseBrowserClient();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!session?.access_token) throw new Error("Only the owner can download this Eraprint card.");
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? "Unable to generate share card.");
  }
  return new File([await response.blob()], filename, { type: "image/png" });
}

export function downloadShareCard(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function shareShareCard(
  file: File,
): Promise<"shared" | "downloaded" | "cancelled"> {
  if (
    typeof navigator.share === "function" &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      throw error;
    }
  }
  downloadShareCard(file);
  return "downloaded";
}
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
