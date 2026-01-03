"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from "lucide-react";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddTransactionModal({ isOpen, onClose }: AddTransactionModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [accountId, setAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [type, setType] = useState<"income" | "expense" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [transferToAccountId, setTransferToAccountId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const { data: accounts } = await supabase.from("accounts").select("*").eq("user_id", session.user.id).order("name");
    setAccounts(accounts || []);

    const { data: cats } = await supabase.from("categories").select("*").order("name");
    setCategories(cats || []);

    if ((accounts || []).length > 0) setAccountId(accounts[0].id);
    if ((cats || []).length > 0) setCategoryId(cats[0].id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast({ title: "Not signed in", description: "You must be signed in to add transactions", variant: "destructive" });
        return;
      }

      const amt = Number(amount);
      if (!accountId || !amt) {
        toast({ title: "Missing fields", description: "Please select account and amount", variant: "destructive" });
        return;
      }

      if (accounts.length === 0) {
        toast({ title: "No accounts", description: "Please create an account first", variant: "destructive" });
        return;
      }

      // Insert transaction
      const { error } = await supabase.from("transactions").insert({
        user_id: session.user.id,
        account_id: accountId,
        category_id: categoryId || null,
        type,
        amount: amt,
        description,
        date,
        transfer_to_account_id: type === "transfer" ? transferToAccountId || null : null,
      }).select();

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      // Update balances
      if (type === "income") {
        const { data: acc } = await supabase.from("accounts").select("balance").eq("id", accountId).single();
        const newBal = Number(acc.balance || 0) + amt;
        await supabase.from("accounts").update({ balance: newBal }).eq("id", accountId);
      } else if (type === "expense") {
        const { data: acc } = await supabase.from("accounts").select("balance").eq("id", accountId).single();
        const newBal = Number(acc.balance || 0) - amt;
        await supabase.from("accounts").update({ balance: newBal }).eq("id", accountId);
      } else if (type === "transfer") {
        const { data: src } = await supabase.from("accounts").select("balance").eq("id", accountId).single();
        const { data: dst } = await supabase.from("accounts").select("balance").eq("id", transferToAccountId).single();
        if (!dst) {
          toast({ title: "Error", description: "Transfer destination not found", variant: "destructive" });
        } else {
          await supabase.from("accounts").update({ balance: Number(src?.balance || 0) - amt }).eq("id", accountId);
          await supabase.from("accounts").update({ balance: Number(dst?.balance || 0) + amt }).eq("id", transferToAccountId);
        }
      }

      toast({ title: "Transaction added", description: "Your transaction was saved." });
      onClose();
      router.refresh();
      
      // Reset form
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-slate-700">
          <h3 className="text-xl font-semibold">Add Transaction</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 hover:rotate-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Transaction Type Selector */}
            <div>
              <label className="block text-sm font-medium mb-3">Transaction Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all duration-200 ${
                    type === "expense"
                      ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                      : "border-gray-200 dark:border-slate-700 hover:border-red-300"
                  }`}
                >
                  <ArrowUpRight className={`h-6 w-6 mb-2 ${type === "expense" ? "text-red-500" : "text-gray-400"}`} />
                  <span className={`text-sm font-medium ${type === "expense" ? "text-red-500" : ""}`}>Expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("income")}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all duration-200 ${
                    type === "income"
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                      : "border-gray-200 dark:border-slate-700 hover:border-green-300"
                  }`}
                >
                  <ArrowDownLeft className={`h-6 w-6 mb-2 ${type === "income" ? "text-green-500" : "text-gray-400"}`} />
                  <span className={`text-sm font-medium ${type === "income" ? "text-green-500" : ""}`}>Income</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("transfer")}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all duration-200 ${
                    type === "transfer"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-gray-200 dark:border-slate-700 hover:border-blue-300"
                  }`}
                >
                  <ArrowLeftRight className={`h-6 w-6 mb-2 ${type === "transfer" ? "text-blue-500" : "text-gray-400"}`} />
                  <span className={`text-sm font-medium ${type === "transfer" ? "text-blue-500" : ""}`}>Transfer</span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₱</span>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-lg font-semibold focus:ring-2 focus:ring-primary transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Account */}
            <div>
              <label htmlFor="account" className="block text-sm font-medium mb-2">
                {type === "transfer" ? "From Account" : "Account"}
              </label>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
                  You don't have any accounts yet. <a href="/accounts" className="text-primary underline">Create an account first</a>
                </p>
              ) : (
                <select
                  id="account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary transition-all"
                  required
                >
                  {accounts.map((a) => (
                    <option value={a.id} key={a.id}>{a.name} - {a.currency}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Transfer To Account */}
            {type === "transfer" && (
              <div className="animate-in slide-in-from-top duration-200">
                <label htmlFor="transferTo" className="block text-sm font-medium mb-2">To Account</label>
                <select
                  id="transferTo"
                  value={transferToAccountId}
                  onChange={(e) => setTransferToAccountId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary transition-all"
                  required
                >
                  <option value="">Select destination account</option>
                  {accounts.filter(a => a.id !== accountId).map((a) => (
                    <option value={a.id} key={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-2">Category</label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary transition-all"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option value={c.id} key={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary transition-all"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">Description (Optional)</label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary transition-all"
                placeholder="Enter description"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex gap-3 p-6 border-t dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || accounts.length === 0}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium hover:shadow-lg"
            >
              {isLoading ? "Adding..." : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
