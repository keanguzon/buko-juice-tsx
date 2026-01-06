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

  const getAccount = (id: string) => accounts.find((a: any) => a?.id === id);

  const [isPayLater, setIsPayLater] = useState(false);
  const [payLaterAccountId, setPayLaterAccountId] = useState<string>("");

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

      const firstCredit = accountsList.find((a: any) => a?.type === "credit_card");
      if (firstCredit) setPayLaterAccountId(firstCredit.id);
    };

    load();
  }, []);

  useEffect(() => {
    if (type !== "expense") setIsPayLater(false);
  }, [type]);

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
      const effectiveAccountId = type === "expense" && isPayLater ? payLaterAccountId : accountId;
      if (!effectiveAccountId || !amt) {
        toast({ title: "Missing fields", description: "Please select account and amount", variant: "destructive" });
        return;
      }

      // Insert transaction
      const { error, data: inserted } = await sb.from("transactions").insert({
        user_id: session.user.id,
        account_id: effectiveAccountId,
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
        const meta = getAccount(effectiveAccountId);
        const { data: acc } = await sb.from("accounts").select("balance").eq("id", effectiveAccountId).single();
        const current = Number(acc?.balance || 0);
        const newBal = meta?.type === "credit_card" ? current - amt : current + amt;
        await sb.from("accounts").update({ balance: newBal }).eq("id", effectiveAccountId);
      } else if (type === "expense") {
        const meta = getAccount(effectiveAccountId);
        const { data: acc } = await sb.from("accounts").select("balance").eq("id", effectiveAccountId).single();
        const current = Number(acc?.balance || 0);
        const newBal = meta?.type === "credit_card" ? current + amt : current - amt;
        await sb.from("accounts").update({ balance: newBal }).eq("id", effectiveAccountId);
      } else if (type === "transfer") {
        // subtract from source
        const { data: src } = await sb.from("accounts").select("balance").eq("id", accountId).single();
        const { data: dst } = await sb.from("accounts").select("balance").eq("id", transferToAccountId).single();
        const srcMeta = getAccount(accountId);
        const dstMeta = getAccount(transferToAccountId);
        if (!dst) {
          toast({ title: "Error", description: "Transfer destination not found", variant: "destructive" });
        } else {
          const srcCurrent = Number(src?.balance || 0);
          const dstCurrent = Number(dst?.balance || 0);
          const nextSrc = srcMeta?.type === "credit_card" ? srcCurrent + amt : srcCurrent - amt;
          const nextDst = dstMeta?.type === "credit_card" ? dstCurrent - amt : dstCurrent + amt;
          await sb.from("accounts").update({ balance: nextSrc }).eq("id", accountId);
          await sb.from("accounts").update({ balance: nextDst }).eq("id", transferToAccountId);
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
        {type === "expense" && (
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPayLater} onChange={(e) => setIsPayLater(e.target.checked)} className="h-4 w-4" />
            PayLater purchase (adds to debt)
          </label>
        )}
        <select
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={type === "expense" && isPayLater ? payLaterAccountId : accountId}
          onChange={(e) => {
            if (type === "expense" && isPayLater) setPayLaterAccountId(e.target.value);
            else setAccountId(e.target.value);
          }}
        >
          {(type === "expense" && isPayLater ? accounts.filter((a: any) => a?.type === "credit_card") : accounts).map((a: any) => (
            <option value={a.id} key={a.id}>{a.name} ({a.currency})</option>
          ))}
        </select>
        {type === "expense" && isPayLater && accounts.filter((a: any) => a?.type === "credit_card").length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">Create a PayLater/Debt account first (type: Credit Card) in Accounts.</p>
        )}
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
