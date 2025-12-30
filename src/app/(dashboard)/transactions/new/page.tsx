"use client";

import AddTransactionForm from "@/components/forms/AddTransactionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewTransactionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add Transaction</h2>
          <p className="text-muted-foreground">Create a new transaction</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTransactionForm />
        </CardContent>
      </Card>
    </div>
  );
}
