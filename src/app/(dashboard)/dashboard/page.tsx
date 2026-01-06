"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  ArrowLeftRight,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const supabase = createClient();
  const sb = supabase as any;
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [currency, setCurrency] = useState("PHP");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
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

        // Get accounts
        const { data: accountsData } = await supabase
          .from("accounts")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        setAccounts(accountsData ?? []);

        // Get recent transactions (newest first)
        const { data: transactionsData, error: txErr } = await sb
          .from("transactions")
          .select(
            "id, user_id, account_id, category_id, type, amount, description, date, transfer_to_account_id, created_at, category:categories(id,name,color), account:accounts!account_id(id,name,type)"
          )
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .order("date", { ascending: false })
          .limit(3);

        if (txErr) {
          console.error("Failed to load recent transactions", txErr);
          setTransactions([]);
        } else {
          setTransactions(transactionsData ?? []);
        }

        // This month's income/expenses
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const { data: monthTransactionsData } = await supabase
          .from("transactions")
          .select("type, amount, account_id, transfer_to_account_id")
          .eq("user_id", session.user.id)
          .gte("date", startOfMonth);

        const monthTransactions = (monthTransactionsData ?? []) as any[];
        const accountTypeById = new Map<string, string>();
        (accountsData || []).forEach((a: any) => {
          if (a?.id) accountTypeById.set(a.id, a.type);
        });
        const isCredit = (accountId?: string | null) => {
          if (!accountId) return false;
          return accountTypeById.get(accountId) === "credit_card";
        };

        // Match Reports "cashflow" logic:
        // - Income counts only when it hits non-credit accounts.
        // - Expenses are spending from non-credit accounts.
        // - Debt payments are transfers from non-credit -> credit_card.
        const income = monthTransactions
          .filter((t) => t.type === "income" && !isCredit(t.account_id))
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const expenses = monthTransactions
          .filter((t) => t.type === "expense" && !isCredit(t.account_id))
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const debtPayments = monthTransactions
          .filter(
            (t) =>
              t.type === "transfer" &&
              !isCredit(t.account_id) &&
              isCredit(t.transfer_to_account_id)
          )
          .reduce((sum, t) => sum + Number(t.amount), 0);

        setMonthlyIncome(income || 0);
        setMonthlyExpenses((expenses + debtPayments) || 0);
      }
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentMoney = accounts
    .filter((a: any) => a?.type !== "credit_card")
    .reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
  const statCards = [
    {
      title: "Total Balance",
      value: formatCurrency(currentMoney, currency),
      icon: Wallet,
      description: `Across ${(accounts || []).filter((a: any) => a?.type !== "credit_card").length || 0} accounts (excluding debt)`,
      color: "text-primary",
    },
    {
      title: "Income",
      value: formatCurrency(monthlyIncome, currency),
      icon: ArrowDownLeft,
      description: "This month",
      color: "text-green-500",
    },
    {
      title: "Expenses",
      value: formatCurrency(monthlyExpenses, currency),
      icon: ArrowUpRight,
      description: "This month",
      color: "text-red-500",
    },
    {
      title: "Net Savings",
      value: formatCurrency(monthlyIncome - monthlyExpenses, currency),
      icon: TrendingUp,
      description: "This month",
      color: monthlyIncome - monthlyExpenses >= 0 ? "text-green-500" : "text-red-500",
    },
  ];

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
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Your financial overview at a glance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Transactions */}
        <Card className="col-span-7">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Your latest financial activity</CardDescription>
              </div>
              {/* View More Button */}
              {transactions && transactions.length > 0 && (
                <Link href="/transactions">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between hover:bg-secondary/50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === "income"
                            ? "bg-green-500/10"
                            : transaction.type === "expense"
                            ? "bg-red-500/10"
                            : "bg-blue-500/10"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-500" />
                        ) : transaction.type === "expense" ? (
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        ) : (
                          <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {transaction.description || transaction.category?.name || "Transaction"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.account?.name} • {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        transaction.type === "income"
                          ? "text-green-500"
                          : transaction.type === "expense"
                          ? "text-red-500"
                          : "text-blue-500"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                      {formatCurrency(Number(transaction.amount), currency)}
                    </span>
                  </div>
                ))}
                {/* View More Link at Bottom */}
                <Link href="/transactions">
                  <Button variant="ghost" className="w-full">
                    See All Transactions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowLeftRight className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground">
                  Start by adding your first transaction
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
