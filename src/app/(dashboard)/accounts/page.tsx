import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Plus, Wallet, CreditCard, Landmark, Smartphone, TrendingUp } from "lucide-react";

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

export default async function AccountsPage() {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", session?.user.id)
    .order("created_at", { ascending: false });

  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accounts</h2>
          <p className="text-muted-foreground">
            Manage your financial accounts
          </p>
        </div>
        <Button>
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
            {formatCurrency(totalBalance)}
          </p>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts && accounts.length > 0 ? (
          accounts.map((account) => {
            const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
            return (
              <Card key={account.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {account.name}
                  </CardTitle>
                  <div
                    className="p-2 rounded-full"
                    style={{ backgroundColor: `${account.color}20` }}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: account.color || "#22c55e" }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(Number(account.balance), account.currency)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {accountTypeLabels[account.type as keyof typeof accountTypeLabels]}
                  </p>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No accounts yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first account to start tracking
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
