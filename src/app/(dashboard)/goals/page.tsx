import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Target, Trophy } from "lucide-react";

export default async function GoalsPage() {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", session?.user.id || "")
    .order("created_at", { ascending: false });

  const activeGoals = goals?.filter((g) => !g.is_completed) || [];
  const completedGoals = goals?.filter((g) => g.is_completed) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Savings Goals</h2>
          <p className="text-muted-foreground">
            Track progress towards your financial goals
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {/* Active Goals */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Active Goals</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeGoals.length > 0 ? (
            activeGoals.map((goal) => {
              const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
              return (
                <Card key={goal.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      {goal.name}
                    </CardTitle>
                    {goal.target_date && (
                      <CardDescription>
                        Target: {formatDate(goal.target_date)}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{formatCurrency(Number(goal.current_amount))}</span>
                      <span className="text-muted-foreground">
                        of {formatCurrency(Number(goal.target_amount))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">No active goals</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Set a goal to start saving
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Goal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Completed Goals
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="opacity-75">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    {goal.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(Number(goal.target_amount))}
                  </p>
                  <p className="text-sm text-muted-foreground">Goal achieved!</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
