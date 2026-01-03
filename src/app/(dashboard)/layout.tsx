import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayoutClient } from "@/components/layout/dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Get user profile
  const { data: profileData } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single();

  const profile = (profileData ?? null) as any;

  const user = {
    email: session.user.email || "",
    name: profile?.name || session.user.user_metadata?.name || session.user.user_metadata?.full_name,
    avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
  };

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>;
}
