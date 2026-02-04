"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Tags, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import AddCategoryModal from "@/components/categories/AddCategoryModal";

type Category = {
  id: string;
  name: string;
  type: string;
  color?: string;
  icon?: string;
  is_default?: boolean;
  user_id?: string;
  created_at?: string;
};

export default function CategoriesPage() {
  const supabase = createClient();
  const sb = supabase as any;

  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCategories = async () => {
    setIsLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    const { data } = await sb
      .from("categories")
      .select("*")
      .or(`user_id.eq.${session.user.id},is_default.eq.true`)
      .order("name");

    setCategories((data ?? []) as Category[]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const incomeCategories = useMemo(
    () => (categories ?? []).filter((c) => c.type === "income"),
    [categories],
  );
  const expenseCategories = useMemo(
    () => (categories ?? []).filter((c) => c.type === "expense"),
    [categories],
  );

  return (
    <>
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header - Redesigned for Mobile */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
            <p className="text-muted-foreground">
              Organize your transactions with categories
            </p>
          </div>
          {/* Button visible only on desktop */}
          <Button onClick={() => setIsModalOpen(true)} className="hidden sm:flex transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
        {/* Button visible only on mobile - below description */}
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:hidden transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg">
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Income Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-green-500" />
              Income Categories
            </CardTitle>
            <CardDescription>Categories for your income sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {!isLoading && incomeCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-[transform,background-color,border-color,box-shadow] duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color || "#22c55e" }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  {category.is_default && (
                    <span className="text-xs text-muted-foreground">Default</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-red-500" />
              Expense Categories
            </CardTitle>
            <CardDescription>Categories for your expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {!isLoading && expenseCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-[transform,background-color,border-color,box-shadow] duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color || "#ef4444" }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  {category.is_default && (
                    <span className="text-xs text-muted-foreground">Default</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <AddCategoryModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onCreated={loadCategories}
    />
    </>
  );
}
