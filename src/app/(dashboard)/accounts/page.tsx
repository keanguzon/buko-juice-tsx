"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Plus, Wallet, CreditCard, Landmark, Smartphone, TrendingUp } from "lucide-react";
import AddAccountModal from "@/components/accounts/AddAccountModal";

const accountTypeIcons = {
  cash: Wallet,
  bank: Landmark,
  credit_card: CreditCard,
  e_wallet: Smartphone,
  investment: TrendingUp,
};

const accountTypeLabels = {
  cash: "Cash",
  bank: "Bank Account",
  credit_card: "Credit Card",
  e_wallet: "E-Wallet",
  investment: "Investment",
};

export default function AccountsPage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState("PHP");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) {
      const { data: pref } = await supabase
        .from("user_preferences")
        .select("currency")
        .eq("user_id", session.user.id)
        .single();
      if (pref && (pref as any).currency) setCurrency((pref as any).currency);

      const { data } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setAccounts(data || []);
    }
    setIsLoading(false);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header - Redesigned for Mobile */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight">Accounts</h2>
              <p className="text-muted-foreground">
                Manage your financial accounts
              </p>
            </div>
            {/* Button visible only on desktop */}
            <Button onClick={() => setIsModalOpen(true)} className="hidden sm:flex transition-all hover:scale-105 hover:shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
          {/* Button visible only on mobile - below description */}
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:hidden transition-all hover:scale-105 hover:shadow-lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>

        {/* Total Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle>Total Balance</CardTitle>
            <CardDescription>Across all accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {formatCurrency(totalBalance, currency)}
            </p>
          </CardContent>
        </Card>

        {/* Accounts Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {!isLoading && accounts && accounts.length > 0 ? (
            accounts.map((account, index) => {
              const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
              return (
                <Card 
                  key={account.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {account.name}
                    </CardTitle>
                    <div className="p-2 rounded-full transition-all duration-200 hover:scale-110" style={{ backgroundColor: `${account.color}20` }}>
                      {account.icon ? (
                        <img src={`/logos/${account.icon}`} alt={account.name} className="h-5 w-5" />
                      ) : (
                        <Icon className="h-4 w-4" style={{ color: account.color || "#22c55e" }} />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(Number(account.balance), currency)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {accountTypeLabels[account.type as keyof typeof accountTypeLabels]}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          ) : !isLoading ? (
            <Card className="col-span-full animate-in fade-in duration-500">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4 animate-pulse" />
                <p className="text-lg font-medium">No accounts yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first account to start tracking
                </p>
                <Button onClick={() => setIsModalOpen(true)} className="transition-all hover:scale-105">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            </div>
          )}
        </div>
      </div>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          loadAccounts();
        }}
        existingAccounts={accounts.map((acc) => ({ icon: acc.icon, is_savings: acc.is_savings }))}
      />
    </>
  );
}
