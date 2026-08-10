import { createClient } from "@supabase/supabase-js";

export async function getAuthenticatedSupabase(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get("authorization");

  if (!url || !key) throw new Error("Supabase is not configured on the server.");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing authenticated Supabase session.");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const userResponse = await supabase.auth.getUser(
    authorization.slice("Bearer ".length),
  );

  if (userResponse.error || !userResponse.data.user) {
    throw new Error("Unable to resolve authenticated user.");
  }

  return supabase;
}
