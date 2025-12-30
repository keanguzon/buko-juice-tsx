"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle } from "lucide-react";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "success">("loading");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error) {
          setStatus("success");
          
          // Notify parent window if this is a popup
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'oauth-success' }, window.location.origin);
          }
          
          // Try to close after a brief delay
          setTimeout(() => {
            window.close();
          }, 1500);
        }
      }
    };

    handleCallback();
  }, [searchParams, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <div className="text-center space-y-4 p-8">
        {status === "loading" ? (
          <>
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="text-lg text-muted-foreground">Completing sign in...</p>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold">Success!</p>
              <p className="text-muted-foreground">You can close this window now.</p>
              <p className="text-sm text-muted-foreground">Return to the main page to continue.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
