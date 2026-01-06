"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Wallet, CreditCard, Landmark, Smartphone, TrendingUp } from "lucide-react";
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
  const sb = supabase as any;
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState("PHP");

  const [isDebtLoading, setIsDebtLoading] = useState(false);
  const [debtByMonth, setDebtByMonth] = useState<Record<string, number>>({});
  const [expenseItemsByMonth, setExpenseItemsByMonth] = useState<Record<string, any[]>>({});
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [previewAfterPay, setPreviewAfterPay] = useState(false);

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

      const accountsList = data || [];
      setAccounts(accountsList);

      // Load credit-card (SpayLater) debt from transactions
      setIsDebtLoading(true);
      try {
        const creditIds = accountsList
          .filter((a: any) => a?.type === "credit_card")
          .map((a: any) => a.id)
          .filter(Boolean);

        if (creditIds.length === 0) {
          setDebtByMonth({});
          setExpenseItemsByMonth({});
          setMonthFilter("all");
        } else {
          const { data: txData, error: txErr } = await sb
            .from("transactions")
            .select(
              "id, account_id, type, amount, description, date, transfer_to_account_id, category:categories(id,name,color), account:accounts!account_id(id,name,type)"
            )
            .eq("user_id", session.user.id)
            .or(
              `account_id.in.(${creditIds.join(",")}),transfer_to_account_id.in.(${creditIds.join(",")})`
            )
            .order("date", { ascending: false })
            .limit(5000);

          if (txErr) {
            console.error("Failed to load debt transactions", txErr);
            setDebtByMonth({});
            setExpenseItemsByMonth({});
            setMonthFilter("all");
          } else {
            const byMonth: Record<string, number> = {};
            const itemsByMonth: Record<string, any[]> = {};

            (txData || []).forEach((t: any) => {
              const monthKey = typeof t?.date === "string" ? t.date.slice(0, 7) : "unknown";
              if (!byMonth[monthKey]) byMonth[monthKey] = 0;
              if (!itemsByMonth[monthKey]) itemsByMonth[monthKey] = [];

              const amt = Number(t?.amount || 0);
              const isCreditSource = creditIds.includes(t?.account_id);
              const isCreditDestination = creditIds.includes(t?.transfer_to_account_id);

              // Debt math rules:
              // - expense on credit_card increases debt
              // - income on credit_card decreases debt
              // - transfer TO credit_card decreases debt (payment)
              // - transfer FROM credit_card increases debt (cash advance / movement)
              if (t.type === "expense" && isCreditSource) {
                byMonth[monthKey] += amt;
                itemsByMonth[monthKey].push(t);
              } else if (t.type === "income" && isCreditSource) {
                byMonth[monthKey] -= amt;
              } else if (t.type === "transfer") {
                if (isCreditDestination) byMonth[monthKey] -= amt;
                if (isCreditSource) byMonth[monthKey] += amt;
              }
            });

            setDebtByMonth(byMonth);
            setExpenseItemsByMonth(itemsByMonth);

            // If user had selected a month that no longer exists, reset to all
            if (monthFilter !== "all" && !byMonth[monthFilter]) setMonthFilter("all");
          }
        }
      } finally {
        setIsDebtLoading(false);
      }
    }
    setIsLoading(false);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  const currentMoney = useMemo(() => {
    return accounts
      .filter((a: any) => a?.type !== "credit_card")
      .reduce((sum, acc) => sum + Number(acc.balance), 0);
  }, [accounts]);

  const sortedMonths = useMemo(() => {
    const keys = Object.keys(debtByMonth).filter((k) => k && k !== "unknown");
    keys.sort((a, b) => (a < b ? 1 : -1));
    return keys;
  }, [debtByMonth]);

  const selectedDebt = useMemo(() => {
    if (monthFilter === "all") {
      return Object.values(debtByMonth).reduce((sum, v) => sum + Math.max(0, Number(v || 0)), 0);
    }
    return Math.max(0, Number(debtByMonth[monthFilter] || 0));
  }, [debtByMonth, monthFilter]);

  const previewMoney = useMemo(() => {
    if (!previewAfterPay) return currentMoney;
    return currentMoney - selectedDebt;
  }, [currentMoney, previewAfterPay, selectedDebt]);

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

        {/* Current Total Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Total Balance</CardTitle>
            <CardDescription>Excluding debt accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(currentMoney, currency)}
              </p>
              <p className="text-sm text-muted-foreground">
                This excludes credit card/debt account balances
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Money Preview (after paying selected debt)</p>
                  <p className="text-2xl font-bold">{formatCurrency(currentMoney, currency)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={previewAfterPay ? "default" : "outline"}
                    onClick={() => setPreviewAfterPay((v) => !v)}
                    disabled={isDebtLoading}
                    title="Preview if you pay the selected debt"
                  >
                    {previewAfterPay ? "Preview: after paying" : "Preview: off"}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" disabled={isDebtLoading || sortedMonths.length === 0}>
                        {monthFilter === "all" ? "All months" : monthFilter}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Debt months</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={monthFilter} onValueChange={setMonthFilter}>
                        <DropdownMenuRadioItem value="all">All months</DropdownMenuRadioItem>
                        {sortedMonths.map((m) => (
                          <DropdownMenuRadioItem key={m} value={m}>
                            {m}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Debt selected ({monthFilter === "all" ? "All" : monthFilter})
                  </p>
                  <p className="font-semibold text-red-500">
                    {isDebtLoading ? "Loading..." : formatCurrency(selectedDebt, currency)}
                  </p>
                </div>
                <div className="space-y-1 text-left sm:text-right">
                  <p className="text-sm text-muted-foreground">Money preview</p>
                  <p className={`text-3xl font-bold ${previewAfterPay ? "text-foreground" : "text-primary"}`}>
                    {formatCurrency(previewMoney, currency)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PayLater / Debt Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>PayLater / Debt (Monthly)</CardTitle>
            <CardDescription>
              Tracks purchases recorded under your PayLater/Debt accounts (type: Credit Card). Your cash stays unchanged until you record payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDebtLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="inline-block h-7 w-7 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-green-500 motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              </div>
            ) : sortedMonths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No credit-card transactions found yet.</p>
            ) : (
              <div className="space-y-4">
                {sortedMonths.map((m) => {
                  const monthDebt = Math.max(0, Number(debtByMonth[m] || 0));
                  const purchases = (expenseItemsByMonth[m] || []).filter((t: any) => t?.type === "expense");
                  return (
                    <div key={m} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{m}</p>
                        <p className="font-semibold text-red-500">{formatCurrency(monthDebt, currency)}</p>
                      </div>

                      {purchases.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {purchases.slice(0, 8).map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t.description || t.category?.name || "Expense"}
                                {t.account?.name ? <span className="opacity-70"> • {t.account.name}</span> : null}
                              </span>
                              <span className="font-medium">{formatCurrency(Number(t.amount || 0), currency)}</span>
                            </div>
                          ))}
                          {purchases.length > 8 && (
                            <p className="text-xs text-muted-foreground">Showing 8 of {purchases.length} items</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-green-500 motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
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
