"use client";

import AddAccountForm from "@/components/forms/AddAccountForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewAccountPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add Wallet</h2>
          <p className="text-muted-foreground">Create a new wallet for your finances</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <AddAccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
