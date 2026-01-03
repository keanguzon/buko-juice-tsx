import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Plus, PieChart } from "lucide-react";

export default async function BudgetsPage() {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: budgets } = await supabase
    .from("budgets")
    .select("*, category:categories(*)")
    .eq("user_id", session?.user.id || "")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Budgets</h2>
          <p className="text-muted-foreground">
            Set and track your spending limits
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Budget
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {budgets && budgets.length > 0 ? (
          budgets.map((budget: any) => {
            // TODO: Calculate spent amount from transactions
            const spent = 0;
            const progress = (spent / Number(budget.amount)) * 100;
            const isOverBudget = progress > 100;

            return (
              <Card key={budget.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{budget.category?.name}</CardTitle>
                  <CardDescription>
                    {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} budget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spent</span>
                    <span className={isOverBudget ? "text-red-500 font-medium" : ""}>
                      {formatCurrency(spent)} / {formatCurrency(Number(budget.amount))}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverBudget ? "bg-red-500" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {formatCurrency(Number(budget.amount) - spent)} remaining
                  </p>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PieChart className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No budgets yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create a budget to track your spending
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Budget
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
