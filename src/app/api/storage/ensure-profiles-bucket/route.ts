import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    return NextResponse.json(
      {
        error: "Server storage is not configured (missing NEXT_PUBLIC_SUPABASE_URL)",
      },
      { status: 500 }
    );
  }

  // If service role isn't configured, we cannot create buckets from the server.
  // Return a non-fatal response so the client can still attempt upload to an existing bucket.
  if (!serviceKey) {
    return NextResponse.json({ ok: false, skipped: true, reason: "missing_service_role" });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.storage.createBucket("profiles", {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
  });

  // If it already exists, that's fine.
  if (error && !/already exists/i.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
