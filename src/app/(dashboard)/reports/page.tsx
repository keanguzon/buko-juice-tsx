"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
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
      // Get last 30 days transactions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data } = await (supabase as any)
        .from("transactions")
        .select("*, category:categories(*)")
        .eq("user_id", session.user.id)
        .gte("date", startDate);

      const transactions = data || [];

      // Calculate summary
      const totalIncome = transactions
        .filter((t: any) => t.type === "income")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const totalExpense = transactions
        .filter((t: any) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const balance = totalIncome - totalExpense;

      setSummary({
        totalIncome,
        totalExpense,
        balance,
        transactionCount: transactions.length,
      });

      // Group by category
      const categoryMap: any = {};
      transactions.forEach((t: any) => {
        if (t.category) {
          const key = t.category.id;
          if (!categoryMap[key]) {
            categoryMap[key] = {
              name: t.category.name,
              color: t.category.color,
              type: t.type,
              total: 0,
              count: 0,
            };
          }
          categoryMap[key].total += Number(t.amount);
          categoryMap[key].count += 1;
        } else {
          const key = t.type === "transfer" ? "transfer" : "uncategorized";
          if (!categoryMap[key]) {
            categoryMap[key] = {
              name: t.type === "transfer" ? "Transfers" : "Uncategorized",
              color: null,
              type: t.type,
              total: 0,
              count: 0,
            };
          }
          categoryMap[key].total += Number(t.amount);
          categoryMap[key].count += 1;
        }
      });

      const categoriesData = Object.values(categoryMap).sort(
        (a: any, b: any) => b.total - a.total
      );
      setCategories(categoriesData.slice(0, 10));
    }
    setLoading(false);
  };

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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(summary?.totalIncome || 0, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(summary?.totalExpense || 0, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (summary?.balance || 0) >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(summary?.balance || 0, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.transactionCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
          <CardDescription>Your spending breakdown by category</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <div className="space-y-4">
              {categories.map((cat: any, idx: number) => {
                const maxTotal = categories[0]?.total || 1;
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
