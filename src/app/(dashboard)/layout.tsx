import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

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
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single();

  const user = {
    email: session.user.email || "",
    name: profile?.name || session.user.user_metadata?.name || session.user.user_metadata?.full_name,
    avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <Header user={user} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
