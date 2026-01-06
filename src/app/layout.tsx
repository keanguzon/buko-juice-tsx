import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { LoadingBar } from "@/components/ui/loading-bar";
import ThemeTransitionOverlay from "@/components/theme/ThemeTransitionOverlay";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Buko Juice - Money Tracker",
  description: "Track your finances with ease. Manage expenses, income, accounts, and categories.",
  keywords: ["money tracker", "finance", "expenses", "accounts", "categories"],
  icons: {
    icon: "/logos/main-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <LoadingBar />
          <ThemeTransitionOverlay />
          <div className="min-h-screen animate-fade-in">{children}</div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
