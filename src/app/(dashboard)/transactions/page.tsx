"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";

export default function TransactionsPage() {
  const supabase = createClient();
  const sb = supabase as any;
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "expense" | "income" | "transfer">("all");

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setIsLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) {
      const { data } = await sb
        .from("transactions")
        .select("*, category:categories(*), account:accounts(*)")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(50);

      setTransactions(data || []);
    }
    setIsLoading(false);
  };

  const filteredTransactions =
    filter === "all" ? transactions : transactions.filter((t) => t.type === filter);

  const filterLabel =
    filter === "all"
      ? "ALL"
      : filter === "expense"
      ? "Expense"
      : filter === "income"
      ? "Income"
      : "Transfer";

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="space-y-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
            <p className="text-muted-foreground">
              View and manage your transactions
            </p>
          </div>
          
          {/* Filter and Add buttons - stacked on mobile, inline on desktop */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                className="transition-all hover:scale-105"
                onClick={() => setFilter("all")}
              >
                ALL
              </Button>
              <Button
                variant={filter === "expense" ? "default" : "outline"}
                size="sm"
                className="transition-all hover:scale-105"
                onClick={() => setFilter("expense")}
              >
                Expense
              </Button>
              <Button
                variant={filter === "income" ? "default" : "outline"}
                size="sm"
                className="transition-all hover:scale-105"
                onClick={() => setFilter("income")}
              >
                Income
              </Button>
              <Button
                variant={filter === "transfer" ? "default" : "outline"}
                size="sm"
                className="transition-all hover:scale-105"
                onClick={() => setFilter("transfer")}
              >
                Transfer
              </Button>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto transition-all hover:scale-105 hover:shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Your complete transaction history</CardDescription>
          <div className="pt-2 text-sm text-muted-foreground">
            Showing: <span className="font-medium text-foreground">{filterLabel}</span>
          </div>
        </CardHeader>
        <CardContent>
          {!isLoading && filteredTransactions && filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              {filteredTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-all duration-200 cursor-pointer hover:shadow-md animate-in slide-in-from-left"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-3 rounded-full transition-all duration-200 ${
                        transaction.type === "income"
                          ? "bg-green-500/10"
                          : transaction.type === "expense"
                          ? "bg-red-500/10"
                          : "bg-blue-500/10"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <ArrowDownLeft className="h-5 w-5 text-green-500" />
                      ) : transaction.type === "expense" ? (
                        <ArrowUpRight className="h-5 w-5 text-red-500" />
                      ) : (
                        <ArrowLeftRight className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {transaction.description || transaction.category?.name || (transaction.type === "transfer" ? "Transfer" : "Transaction")}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{transaction.account?.name}</span>
                        {transaction.category?.name && (
                          <>
                            <span>•</span>
                            <span>{transaction.category.name}</span>
                          </>
                        )}
                        {transaction.type === "transfer" && (
                          <>
                            <span>•</span>
                            <span>Transfer</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        transaction.type === "income"
                          ? "text-green-500"
                          : transaction.type === "expense"
                          ? "text-red-500"
                          : "text-blue-500"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                      {formatCurrency(Number(transaction.amount))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-500">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No transactions found</p>
              <p className="text-sm text-muted-foreground mb-4">
                Try changing the filter or add a transaction
              </p>
              <Button onClick={() => setIsModalOpen(true)} className="transition-all hover:scale-105">
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Add Transaction Modal */}
    <AddTransactionModal
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        loadTransactions();
      }}
    />
  </>
  );
}
