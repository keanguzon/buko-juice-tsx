import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Target,
  ArrowLeftRight,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", session?.user.id || "")
    .eq("is_active", true);

  // Get recent transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, category:categories(*), account:accounts(*)")
    .eq("user_id", session?.user.id || "")
    .order("date", { ascending: false })
    .limit(5);

  // Get goals
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", session?.user.id || "")
    .eq("is_completed", false)
    .limit(3);

  // Calculate totals
  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
  
  // Calculate this month's income/expenses
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  
  const { data: monthTransactions } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", session?.user.id || "")
    .gte("date", startOfMonth);

  const monthlyIncome = monthTransactions
    ?.filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const monthlyExpenses = monthTransactions
    ?.filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const statCards = [
    {
      title: "Total Balance",
      value: formatCurrency(totalBalance),
      icon: Wallet,
      description: `Across ${accounts?.length || 0} accounts`,
      color: "text-primary",
    },
    {
      title: "Income",
      value: formatCurrency(monthlyIncome),
      icon: ArrowDownLeft,
      description: "This month",
      color: "text-green-500",
    },
    {
      title: "Expenses",
      value: formatCurrency(monthlyExpenses),
      icon: ArrowUpRight,
      description: "This month",
      color: "text-red-500",
    },
    {
      title: "Net Savings",
      value: formatCurrency(monthlyIncome - monthlyExpenses),
      icon: TrendingUp,
      description: "This month",
      color: monthlyIncome - monthlyExpenses >= 0 ? "text-green-500" : "text-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-in fade-in slide-in-from-top duration-500">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Your financial overview at a glance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={stat.title} className="animate-in slide-in-from-bottom hover:shadow-lg hover:-translate-y-1 transition-all duration-200" style={{ animationDelay: `${index * 100}ms` }}>
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
        <Card className="col-span-4 animate-in slide-in-from-left duration-500 delay-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between animate-in slide-in-from-left hover:bg-secondary/50 p-2 rounded-lg transition-all duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
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
                      {formatCurrency(Number(transaction.amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                <ArrowLeftRight className="h-12 w-12 text-muted-foreground/50 mb-4 animate-pulse" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground">
                  Start by adding your first transaction
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="col-span-3 animate-in slide-in-from-right duration-500 delay-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Savings Goals
            </CardTitle>
            <CardDescription>Track your progress</CardDescription>
          </CardHeader>
          <CardContent>
            {goals && goals.length > 0 ? (
              <div className="space-y-4">
                {goals.map((goal, index) => {
                  const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
                  return (
                    <div key={goal.id} className="space-y-2 animate-in slide-in-from-right hover:bg-secondary/50 p-2 rounded-lg transition-all duration-200" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{goal.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(Number(goal.current_amount))}</span>
                        <span>{formatCurrency(Number(goal.target_amount))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                <Target className="h-12 w-12 text-muted-foreground/50 mb-4 animate-pulse" />
                <p className="text-muted-foreground">No goals yet</p>
                <p className="text-sm text-muted-foreground">
                  Set a savings goal to track your progress
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
