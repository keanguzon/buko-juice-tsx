"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, Loader2 } from "lucide-react";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="landing-bg-animation">
        <div className="landing-bg-blob landing-bg-blob-1" />
        <div className="landing-bg-blob landing-bg-blob-2" />
      </div>

      <Card className="w-full max-w-md landing-card-glow relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/logos/main-logo.png" alt="Buko Juice Logo" width={40} height={40} className="h-10 w-10" />
              <span className="text-2xl font-bold">Buko Juice</span>
            </Link>
          </div>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Verify your email</CardTitle>
          <CardDescription>
            We've sent a verification link to your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-primary/10 rounded-lg space-y-3">
            {email && (
              <p className="text-sm text-center">
                <strong>{email}</strong>
              </p>
            )}
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Click the verification link in your email to activate your account</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Check your spam folder if you don't see the email</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>The link will expire in 24 hours</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/login" className="block">
              <Button variant="default" className="w-full">
                Go to Sign In
              </Button>
            </Link>
            <p className="text-xs text-center text-muted-foreground">
              Already verified? Sign in to access your account
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
