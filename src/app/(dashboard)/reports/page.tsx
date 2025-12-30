import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          Analyze your financial data with detailed reports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>Monthly comparison chart</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <BarChart3 className="h-24 w-24 text-muted-foreground/30" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>See where your money goes</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <BarChart3 className="h-24 w-24 text-muted-foreground/30" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Track changes over time</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <BarChart3 className="h-24 w-24 text-muted-foreground/30" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Account Balances</CardTitle>
            <CardDescription>Balance history over time</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <BarChart3 className="h-24 w-24 text-muted-foreground/30" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium">Charts coming soon!</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            We&apos;re working on beautiful interactive charts to help you visualize your financial data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
