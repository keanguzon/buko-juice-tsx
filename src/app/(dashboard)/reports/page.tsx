"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"purchases" | "cashflow">("purchases");
  const [currency, setCurrency] = useState("PHP");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    let userCurrency = "PHP";
    if (session?.user?.id) {
      const { data: pref } = await supabase
        .from("user_preferences")
        .select("currency")
        .eq("user_id", session.user.id)
        .single();
      if (pref && (pref as any).currency) userCurrency = (pref as any).currency;
      setCurrency(userCurrency);

      const { data: accountsData } = await (supabase as any)
        .from("accounts")
        .select("id,name,type")
        .eq("user_id", session.user.id);
      setAccounts(accountsData || []);

      // Get last 30 days transactions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data } = await (supabase as any)
        .from("transactions")
        .select("*, category:categories(*)")
        .eq("user_id", session.user.id)
        .gte("date", startDate);

      setTransactions(data || []);
    }
    setLoading(false);
  };

  const accountById = useMemo(() => {
    const map = new Map<string, any>();
    (accounts || []).forEach((a: any) => {
      if (a?.id) map.set(a.id, a);
    });
    return map;
  }, [accounts]);

  const computed = useMemo(() => {
    const txs = transactions || [];

    const isCredit = (accountId?: string | null) => {
      if (!accountId) return false;
      return accountById.get(accountId)?.type === "credit_card";
    };

    // Debt metrics (always computed)
    const debtAdded = txs
      .filter((t: any) => t.type === "expense" && isCredit(t.account_id))
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const debtPaid = txs
      .filter(
        (t: any) =>
          t.type === "transfer" &&
          !isCredit(t.account_id) &&
          isCredit(t.transfer_to_account_id)
      )
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const endingDebt = (accounts || [])
      .filter((a: any) => a?.type === "credit_card")
      .reduce((sum: number, a: any) => sum + Number(a?.balance || 0), 0);

    // View-specific summary + category aggregation
    const categoryMap: Record<string, any> = {};

    const addCategory = (key: string, row: { name: string; color: string | null; total: number }) => {
      if (!categoryMap[key]) {
        categoryMap[key] = { name: row.name, color: row.color, total: 0, count: 0 };
      }
      categoryMap[key].total += row.total;
      categoryMap[key].count += 1;
    };

    let totalIn = 0;
    let totalOut = 0;
    let txCount = 0;

    if (viewMode === "purchases") {
      // Income counts only when it hits non-credit accounts.
      const incomeTx = txs.filter((t: any) => t.type === "income" && !isCredit(t.account_id));
      const expenseTx = txs.filter((t: any) => t.type === "expense");

      totalIn = incomeTx.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      totalOut = expenseTx.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      txCount = incomeTx.length + expenseTx.length;

      expenseTx.forEach((t: any) => {
        const cat = t.category;
        if (cat) {
          addCategory(cat.id, { name: cat.name, color: cat.color || null, total: Number(t.amount) });
        } else {
          addCategory("uncategorized", { name: "Uncategorized", color: null, total: Number(t.amount) });
        }
      });
    } else {
      // Cashflow: money that actually moved in/out of non-credit accounts.
      const incomeTx = txs.filter((t: any) => t.type === "income" && !isCredit(t.account_id));
      const expenseTx = txs.filter((t: any) => t.type === "expense" && !isCredit(t.account_id));

      // Debt payments are transfers from non-credit -> credit_card
      const debtPayTx = txs.filter(
        (t: any) =>
          t.type === "transfer" &&
          !isCredit(t.account_id) &&
          isCredit(t.transfer_to_account_id)
      );

      totalIn = incomeTx.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      totalOut =
        expenseTx.reduce((sum: number, t: any) => sum + Number(t.amount), 0) +
        debtPayTx.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      txCount = incomeTx.length + expenseTx.length + debtPayTx.length;

      expenseTx.forEach((t: any) => {
        const cat = t.category;
        if (cat) {
          addCategory(cat.id, { name: cat.name, color: cat.color || null, total: Number(t.amount) });
        } else {
          addCategory("uncategorized", { name: "Uncategorized", color: null, total: Number(t.amount) });
        }
      });
      debtPayTx.forEach((t: any) => {
        addCategory("debt_payment", { name: "Debt payments", color: null, total: Number(t.amount) });
      });
    }

    const net = totalIn - totalOut;
    const topCategories = Object.values(categoryMap)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 10);

    return {
      summary: {
        totalIn,
        totalOut,
        net,
        transactionCount: txCount,
      },
      debt: {
        added: debtAdded,
        paid: debtPaid,
        ending: endingDebt,
      },
      topCategories,
    };
  }, [transactions, accounts, accountById, viewMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          Analyze your financial data (Last 30 days)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={viewMode === "purchases" ? "default" : "outline"}
          onClick={() => setViewMode("purchases")}
        >
          Spending (Purchases)
        </Button>
        <Button
          size="sm"
          variant={viewMode === "cashflow" ? "default" : "outline"}
          onClick={() => setViewMode("cashflow")}
        >
          Cashflow (Paid)
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total In</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(computed.summary.totalIn || 0, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Out</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(computed.summary.totalOut || 0, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (computed.summary.net || 0) >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(computed.summary.net || 0, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{computed.summary.transactionCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Debt Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debt Added</CardTitle>
            <CardDescription>New PayLater purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(computed.debt.added || 0, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debt Paid</CardTitle>
            <CardDescription>Cash → PayLater payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(computed.debt.paid || 0, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ending Debt</CardTitle>
            <CardDescription>Current outstanding balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(computed.debt.ending || 0, currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
          <CardDescription>
            {viewMode === "purchases" ? "Your purchases breakdown" : "Your cash outflow breakdown"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {computed.topCategories.length > 0 ? (
            <div className="space-y-4">
              {computed.topCategories.map((cat: any, idx: number) => {
                const maxTotal = computed.topCategories[0]?.total || 1;
                const percentage = (cat.total / maxTotal) * 100;
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color || "#6b7280" }}
                        />
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-sm text-muted-foreground">({cat.count})</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(cat.total, currency)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: cat.color || "#6b7280",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No transactions in the last 30 days</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
