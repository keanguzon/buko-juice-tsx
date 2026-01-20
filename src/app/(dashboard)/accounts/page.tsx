"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Wallet, CreditCard, Landmark, Smartphone, TrendingUp, GripVertical, Edit2 } from "lucide-react";
import AddAccountModal from "@/components/accounts/AddAccountModal";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";

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
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [defaultTransactionAccountId, setDefaultTransactionAccountId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState("PHP");
  const [interestRateDraft, setInterestRateDraft] = useState<Record<string, string>>({});

  const [isDebtLoading, setIsDebtLoading] = useState(false);
  const [debtByMonth, setDebtByMonth] = useState<Record<string, number>>({});
  const [expenseItemsByMonth, setExpenseItemsByMonth] = useState<Record<string, any[]>>({});
  const [selectedDebtMonths, setSelectedDebtMonths] = useState<string[]>([]);
  const [previewAfterPay, setPreviewAfterPay] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const normalizeLogoFilename = (filename: string) => {
    const cleaned = filename.replace(/^\/?logos\//i, "").replace(/^\//, "");
    return cleaned.replace(/\.avif$/i, ".png");
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    setInterestRateDraft((prev) => {
      const next = { ...prev };
      for (const acc of accounts || []) {
        if (!acc?.id) continue;
        if (!acc?.is_savings) continue;
        if (next[acc.id] === undefined) {
          next[acc.id] = String(Number(acc?.interest_rate || 0));
        }
      }
      return next;
    });
  }, [accounts]);

  const saveInterestRate = async (accountId: string) => {
    const raw = (interestRateDraft[accountId] ?? "").trim();
    const parsed = raw === "" ? 0 : Number(raw);
    const nextRate = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

    const currentAcc = accounts.find((a) => a?.id === accountId);
    const currentRate = Number(currentAcc?.interest_rate || 0);
    if (!currentAcc || !currentAcc?.is_savings) return;
    if (Math.abs(currentRate - nextRate) < 1e-9) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const { error } = await sb
      .from("accounts")
      .update({ interest_rate: nextRate })
      .eq("id", accountId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Failed to update interest rate", error);
      // Revert draft back to stored value
      setInterestRateDraft((prev) => ({ ...prev, [accountId]: String(currentRate) }));
      return;
    }

    setAccounts((prev) =>
      prev.map((a) => (a?.id === accountId ? { ...a, interest_rate: nextRate } : a))
    );
    setInterestRateDraft((prev) => ({ ...prev, [accountId]: String(nextRate) }));
  };

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

      let accountsList: any[] = [];

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", session.user.id)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from("accounts")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (fallbackErr) {
          console.error("Failed to load accounts", fallbackErr);
          accountsList = [];
        } else {
          accountsList = fallbackData || [];
        }
      } else {
        accountsList = data || [];
      }

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
          setSelectedDebtMonths([]);
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
            setSelectedDebtMonths([]);
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
          }
        }
      } finally {
        setIsDebtLoading(false);
      }
    }
    setIsLoading(false);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newAccounts = [...accounts];
    const draggedItem = newAccounts[draggedIndex];
    newAccounts.splice(draggedIndex, 1);
    newAccounts.splice(index, 0, draggedItem);

    setAccounts(newAccounts);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const saveAccountOrder = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const updates = accounts.map((acc, idx) => 
      sb.from("accounts")
        .update({ display_order: idx })
        .eq("id", acc.id)
        .eq("user_id", session.user.id)
    );

    await Promise.all(updates);
    setIsEditingOrder(false);
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

  useEffect(() => {
    setSelectedDebtMonths((prev) => {
      if (sortedMonths.length === 0) return [];
      if (!prev || prev.length === 0) return sortedMonths;

      const valid = prev.filter((m) => sortedMonths.includes(m));
      if (valid.length === 0) return sortedMonths;

      const validSet = new Set(valid);
      const ordered = sortedMonths.filter((m) => validSet.has(m));
      if (ordered.length === sortedMonths.length) return sortedMonths;
      return ordered;
    });
  }, [sortedMonths]);

  const isAllMonthsSelected = useMemo(() => {
    return sortedMonths.length > 0 && selectedDebtMonths.length === sortedMonths.length;
  }, [selectedDebtMonths.length, sortedMonths.length]);

  const selectedMonthsLabel = useMemo(() => {
    if (sortedMonths.length === 0) return "All";
    if (isAllMonthsSelected) return "All";
    if (selectedDebtMonths.length === 1) return selectedDebtMonths[0];
    return `${selectedDebtMonths.length} selected`;
  }, [isAllMonthsSelected, selectedDebtMonths, sortedMonths.length]);

  const selectedMonthsDetailLabel = useMemo(() => {
    if (sortedMonths.length === 0) return "All months";
    if (isAllMonthsSelected) return "All months";
    return selectedDebtMonths.join(", ");
  }, [isAllMonthsSelected, selectedDebtMonths, sortedMonths.length]);

  const selectedDebt = useMemo(() => {
    if (sortedMonths.length === 0) return 0;
    const months = isAllMonthsSelected ? sortedMonths : selectedDebtMonths;
    return months.reduce((sum, m) => sum + Math.max(0, Number(debtByMonth[m] || 0)), 0);
  }, [debtByMonth, isAllMonthsSelected, selectedDebtMonths, sortedMonths]);

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
                  <p className="text-sm text-muted-foreground">
                    Debt selected ({selectedMonthsDetailLabel})
                  </p>
                  <p className="font-semibold text-red-500">
                    {isDebtLoading ? "Loading..." : formatCurrency(selectedDebt, currency)}
                  </p>
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
                        {isAllMonthsSelected ? "All months" : selectedMonthsLabel}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Debt months</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={isAllMonthsSelected}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(checked) => {
                          const next = checked === true;
                          if (next) {
                            setSelectedDebtMonths(sortedMonths);
                            return;
                          }
                          // Keep at least one month selected; fall back to latest month.
                          setSelectedDebtMonths(sortedMonths.length > 0 ? [sortedMonths[0]] : []);
                        }}
                        className="border-l-2 border-transparent data-[state=checked]:border-primary"
                      >
                        All months
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      {sortedMonths.map((m) => (
                        <DropdownMenuCheckboxItem
                          key={m}
                          checked={selectedDebtMonths.includes(m)}
                          onSelect={(e) => e.preventDefault()}
                          onCheckedChange={(checked) => {
                            const next = checked === true;
                            setSelectedDebtMonths((prev) => {
                              const prevSet = new Set(prev && prev.length > 0 ? prev : sortedMonths);

                              if (next) prevSet.add(m);
                              else prevSet.delete(m);

                              if (prevSet.size === 0) return sortedMonths;
                              if (prevSet.size === sortedMonths.length) return sortedMonths;

                              return sortedMonths.filter((x) => prevSet.has(x));
                            });
                          }}
                          className="border-l-2 border-transparent data-[state=checked]:border-primary"
                        >
                          {m}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {previewAfterPay && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Money after paying selected debt</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(previewMoney, currency)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Accounts Card with Reordering */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Accounts</CardTitle>
                <CardDescription>Your financial accounts</CardDescription>
              </div>
              {!isEditingOrder ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingOrder(true)}
                  disabled={!(accounts && accounts.length > 1)}
                  title={accounts && accounts.length > 1 ? "Reorder your accounts" : "Add at least two accounts to reorder"}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Order
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingOrder(false);
                      loadAccounts();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveAccountOrder}
                  >
                    Save Order
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isLoading && accounts && accounts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account, index) => {
                  const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
                  return (
                    <Card
                      key={account.id}
                      draggable={isEditingOrder}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (!isEditingOrder) {
                          setDefaultTransactionAccountId(account.id);
                          setIsAddTransactionOpen(true);
                        }
                      }}
                      className={
                        isEditingOrder
                          ? "cursor-move transition-all duration-200"
                          : "cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                      }
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium truncate pr-2">
                          {account.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {isEditingOrder ? <GripVertical className="h-5 w-5 text-muted-foreground" /> : null}
                          <div
                            className="p-2 rounded-full transition-all duration-200 hover:scale-110"
                            style={{ backgroundColor: `${account.color}20` }}
                          >
                            {account.icon ? (
                              <img
                                src={`/logos/${normalizeLogoFilename(account.icon)}`}
                                alt={account.name}
                                className="h-5 w-5"
                              />
                            ) : (
                              <Icon className="h-4 w-4" style={{ color: account.color || "#22c55e" }} />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(Number(account.balance), currency)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {accountTypeLabels[account.type as keyof typeof accountTypeLabels]}
                        </p>
                        {account?.is_savings ? (
                          <div
                            className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Interest:</span>
                            <Input
                              inputMode="decimal"
                              type="number"
                              step="0.01"
                              min={0}
                              className="h-7 w-20 px-2 text-xs"
                              value={interestRateDraft[account.id] ?? String(Number(account?.interest_rate || 0))}
                              onChange={(e) =>
                                setInterestRateDraft((prev) => ({
                                  ...prev,
                                  [account.id]: e.target.value,
                                }))
                              }
                              onBlur={() => saveInterestRate(account.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.currentTarget as HTMLInputElement).blur();
                                }
                              }}
                              aria-label="Interest rate percent per year"
                            />
                            <span>%/yr</span>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : !isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4 animate-pulse" />
                <p className="text-lg font-medium">No accounts yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first account to start tracking
                </p>
                <Button onClick={() => setIsModalOpen(true)} className="transition-all hover:scale-105">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-green-500"></div>
              </div>
            )}
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

      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        defaultAccountId={defaultTransactionAccountId}
        onClose={() => {
          setIsAddTransactionOpen(false);
          setDefaultTransactionAccountId(undefined);
          loadAccounts();
        }}
      />
    </>
  );
}
