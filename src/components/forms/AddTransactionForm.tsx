"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function AddTransactionForm() {
  const supabase = createClient();
  const sb = supabase as any;
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
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data: accountsData } = await sb.from("accounts").select("*").eq("user_id", session.user.id).order("name");
      const accountsList = (accountsData ?? []) as any[];
      setAccounts(accountsList);

      const { data: catsData } = await sb.from("categories").select("*").order("name");
      const catsList = (catsData ?? []) as any[];
      setCategories(catsList);

      if (accountsList.length > 0) setAccountId(accountsList[0]?.id ?? "");
      if (catsList.length > 0) setCategoryId(catsList[0]?.id ?? "");
    };

    load();
  }, []);

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

      // Insert transaction
      const { error, data: inserted } = await sb.from("transactions").insert({
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
        const { data: acc } = await sb.from("accounts").select("balance").eq("id", accountId).single();
        const newBal = Number(acc?.balance || 0) + amt;
        await sb.from("accounts").update({ balance: newBal }).eq("id", accountId);
      } else if (type === "expense") {
        const { data: acc } = await sb.from("accounts").select("balance").eq("id", accountId).single();
        const newBal = Number(acc?.balance || 0) - amt;
        await sb.from("accounts").update({ balance: newBal }).eq("id", accountId);
      } else if (type === "transfer") {
        // subtract from source
        const { data: src } = await sb.from("accounts").select("balance").eq("id", accountId).single();
        const { data: dst } = await sb.from("accounts").select("balance").eq("id", transferToAccountId).single();
        if (!dst) {
          toast({ title: "Error", description: "Transfer destination not found", variant: "destructive" });
        } else {
          await sb.from("accounts").update({ balance: Number(src?.balance || 0) - amt }).eq("id", accountId);
          await sb.from("accounts").update({ balance: Number(dst?.balance || 0) + amt }).eq("id", transferToAccountId);
        }
      }

      toast({ title: "Transaction added", description: "Your transaction was saved." });
      router.push("/transactions");
      router.refresh();
    } catch (err) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="text-sm font-medium">Type</label>
        <select className="mt-1 w-full rounded-md border px-3 py-2" value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Account</label>
        <select className="mt-1 w-full rounded-md border px-3 py-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option value={a.id} key={a.id}>{a.name} ({a.currency})</option>
          ))}
        </select>
      </div>

      {type === "transfer" && (
        <div>
          <label className="text-sm font-medium">Transfer to</label>
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={transferToAccountId} onChange={(e) => setTransferToAccountId(e.target.value)}>
            <option value="">Select destination account</option>
            {accounts.filter(a => a.id !== accountId).map((a) => (
              <option value={a.id} key={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-sm font-medium">Category</label>
        <select className="mt-1 w-full rounded-md border px-3 py-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option value={c.id} key={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Amount</label>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" required />
      </div>

      <div>
        <label className="text-sm font-medium">Date</label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Transaction"}</Button>
        <Button variant="ghost" onClick={() => window.history.back()}>Cancel</Button>
      </div>
    </form>
  );
}
