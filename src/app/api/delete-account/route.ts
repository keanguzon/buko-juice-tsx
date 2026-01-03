import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const cookieStore = cookies();
  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "Email not available" }, { status: 400 });
  }

  // Verify password by signing in again (reauth)
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (reauthError) {
    return NextResponse.json({ error: "Invalid password" }, { status: 403 });
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
