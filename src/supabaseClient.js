import { createClient } from "@supabase/supabase-js";

// These are safe to keep here: the anon/publishable key is designed to be
// public — it can only do what your Row Level Security policies allow.
// (Right now those policies are wide open — see supabase/schema.sql — so
// treat this as a dev-only setup until Build 25 adds real auth-based rules.)
const SUPABASE_URL = "https://tuwidxytiurjvpibcyie.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1d2lkeHl0aXVyanZwaWJjeWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzExMzgsImV4cCI6MjEwNTA0NzEzOH0.oOWIHYU_QauwdppAKd-PHNWngkzEcm7j-T3U4ZvGraI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * One-off connection check. Doesn't touch app state — just confirms the
 * browser can reach the project and that the schema.sql tables exist.
 * Call this from anywhere (e.g. a useEffect in App(), or the browser
 * console via `import('./supabaseClient.js').then(m => m.testConnection())`)
 * and read the result in the console.
 */
export async function testConnection() {
  const { data, error, count } = await supabase
    .from("project_groups")
    .select("*", { count: "exact" });

  if (error) {
    console.error("[Supabase] Connection test FAILED:", error.message);
    if (error.message.includes("relation") || error.code === "42P01") {
      console.error("[Supabase] It looks like schema.sql hasn't been run yet in the SQL Editor.");
    }
    return { ok: false, error: error.message };
  }

  console.log(`[Supabase] Connected. project_groups table has ${count} row(s).`, data);
  return { ok: true, count, data };
}
