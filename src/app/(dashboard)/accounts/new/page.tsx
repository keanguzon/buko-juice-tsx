"use client";

import AddAccountForm from "@/components/forms/AddAccountForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewAccountPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add Account</h2>
          <p className="text-muted-foreground">Create a new account for your finances</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New account</CardTitle>
        </CardHeader>
        <CardContent>
          <AddAccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
