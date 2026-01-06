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

  const [isPayLater, setIsPayLater] = useState(false);
  const [payLaterAccountId, setPayLaterAccountId] = useState<string>("");
  const [installments, setInstallments] = useState<number>(1);
  const [startMonth, setStartMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const debtAccounts = accounts.filter((a: any) => a?.type === "credit_card");

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-select first matching category when type changes
    if (type === "transfer") {
      setCategoryId("transfer");
    } else {
      const matchingCats = categories.filter(c => c.type === type);
      if (matchingCats.length > 0) {
        setCategoryId(matchingCats[0]?.id ?? "");
      }
    }
  }, [type, categories]);

  useEffect(() => {
    // PayLater mode only makes sense for expenses
    if (type !== "expense") {
      setIsPayLater(false);
      setInstallments(1);
    }
  }, [type]);

  const loadData = async () => {
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

  const getAccount = (id: string) => accounts.find((a: any) => a?.id === id);

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
      if (!effectiveAccountId || !Number.isFinite(amt) || amt <= 0) {
        toast({ title: "Missing fields", description: "Please select account and amount", variant: "destructive" });
        return;
      }

      if (accounts.length === 0) {
        toast({ title: "No accounts", description: "Please create an account first", variant: "destructive" });
        return;
      }

      if (type === "expense" && isPayLater && !effectiveAccountId) {
        toast({ title: "Missing fields", description: "Please select a PayLater/Credit Card account", variant: "destructive" });
        return;
      }

      // Prevent negative balances (no overdraft) for non-credit accounts.
      if (type === "expense" || type === "transfer") {
        if (type === "transfer") {
          if (!transferToAccountId) {
            toast({ title: "Missing fields", description: "Please select a destination account", variant: "destructive" });
            return;
          }
          if (transferToAccountId === effectiveAccountId) {
            toast({ title: "Invalid transfer", description: "Source and destination accounts must be different", variant: "destructive" });
            return;
          }
        }

        const srcAcc = getAccount(effectiveAccountId);
        const srcType = srcAcc?.type;
        const currentBal = Number(srcAcc?.balance || 0);

        // Credit cards are tracked as "debt" (balance can grow with purchases).
        // Only block overdraft for non-credit accounts.
        if (srcType !== "credit_card") {
          const nextBal = currentBal - amt;
          if (nextBal < 0) {
            toast({
              title: "Not enough balance",
              description: `Not enough money in ${srcAcc?.name || "this account"}. Available: ₱${currentBal.toFixed(2)}.`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Insert transaction(s) - for PayLater with installments, create multiple transactions
      if (type === "expense" && isPayLater && installments > 1) {
        const installmentAmount = amt / installments;
        const transactions = [];
        
        for (let i = 0; i < installments; i++) {
          const installmentDate = new Date(startMonth + "-01");
          installmentDate.setMonth(installmentDate.getMonth() + i);
          const dateStr = installmentDate.toISOString().slice(0, 10);
          
          transactions.push({
            user_id: session.user.id,
            account_id: effectiveAccountId,
            category_id: categoryId || null,
            type,
            amount: installmentAmount,
            description: `${description} (Installment ${i + 1}/${installments})`,
            date: dateStr,
            transfer_to_account_id: null,
          });
        }
        
        const { error } = await sb.from("transactions").insert(transactions);
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }
        
        // Update debt account balance (sum of all installments)
        const { data: acc } = await sb.from("accounts").select("balance").eq("id", effectiveAccountId).single();
        const current = Number(acc?.balance || 0);
        const newBal = current + amt; // Debt increases by total amount
        await sb.from("accounts").update({ balance: newBal }).eq("id", effectiveAccountId);
      } else {
        // Single transaction
        // For PayLater expenses, use startMonth date instead of current date
        const transactionDate = (type === "expense" && isPayLater) 
          ? new Date(startMonth + "-01").toISOString().slice(0, 10)
          : date;
        
        const { error } = await sb.from("transactions").insert({
          user_id: session.user.id,
          account_id: effectiveAccountId,
          category_id: type === "transfer" ? null : (categoryId || null),
          type,
          amount: amt,
          description,
          date: transactionDate,
          transfer_to_account_id: type === "transfer" ? transferToAccountId || null : null,
        }).select();

        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }

        // Update balances for single transaction
        const effAcc = getAccount(effectiveAccountId);
        const effType = effAcc?.type;

        if (type === "income") {
          const { data: acc } = await sb.from("accounts").select("balance").eq("id", effectiveAccountId).single();
          const current = Number(acc?.balance || 0);
          const newBal = effType === "credit_card" ? current - amt : current + amt;
          await sb.from("accounts").update({ balance: newBal }).eq("id", effectiveAccountId);
        } else if (type === "expense") {
          const { data: acc } = await sb.from("accounts").select("balance").eq("id", effectiveAccountId).single();
          const current = Number(acc?.balance || 0);
          const newBal = effType === "credit_card" ? current + amt : current - amt;
          await sb.from("accounts").update({ balance: newBal }).eq("id", effectiveAccountId);
        } else if (type === "transfer") {
          const { data: src } = await sb.from("accounts").select("balance").eq("id", effectiveAccountId).single();
          const { data: dst } = await sb.from("accounts").select("balance").eq("id", transferToAccountId).single();

          const srcMeta = getAccount(effectiveAccountId);
          const dstMeta = getAccount(transferToAccountId);

          if (!dst) {
            toast({ title: "Error", description: "Transfer destination not found", variant: "destructive" });
          } else {
            const srcCurrent = Number(src?.balance || 0);
            const dstCurrent = Number(dst?.balance || 0);

            // For credit cards, balance is "debt":
            // - Paying a credit card (transfer to credit_card) reduces debt (dst - amt)
            // - Sending from credit card increases debt (src + amt)
            const nextSrc = srcMeta?.type === "credit_card" ? srcCurrent + amt : srcCurrent - amt;
            const nextDst = dstMeta?.type === "credit_card" ? dstCurrent - amt : dstCurrent + amt;

            await sb.from("accounts").update({ balance: nextSrc }).eq("id", effectiveAccountId);
            await sb.from("accounts").update({ balance: nextDst }).eq("id", transferToAccountId);
          }
        }
      }

      toast({ 
        title: "Transaction added", 
        description: isPayLater && installments > 1 
          ? `Created ${installments} installments successfully.` 
          : "Your transaction was saved." 
      });
      
      // Reset form
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      setIsPayLater(false);
      setInstallments(1);
      setStartMonth(new Date().toISOString().slice(0, 7));
      
      // Small delay to ensure DB has updated before closing
      setTimeout(() => {
        onClose();
      }, 100);
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
                {type === "transfer" ? "From Account" : isPayLater && type === "expense" ? "PayLater/Debt Account" : "Account"}
              </label>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
                  You don't have any accounts yet. <a href="/accounts" className="text-primary underline">Create an account first</a>
                </p>
              ) : (
                <select
                  id="account"
                  value={isPayLater && type === "expense" ? payLaterAccountId : accountId}
                  onChange={(e) => {
                    if (isPayLater && type === "expense") {
                      setPayLaterAccountId(e.target.value);
                    } else {
                      setAccountId(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary transition-all"
                  required
                >
                  {(isPayLater && type === "expense" 
                    ? accounts.filter((a: any) => a?.type === "credit_card") 
                    : accounts.filter((a: any) => a?.type !== "credit_card")
                  ).map((a: any) => (
                    <option value={a.id} key={a.id}>{a.name} - {a.currency}</option>
                  ))}
                </select>
              )}
              {isPayLater && type === "expense" && accounts.filter((a: any) => a?.type === "credit_card").length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No PayLater/Debt accounts yet. Create one in Accounts (type: Credit Card) and name it “SpayLater”.
                </p>
              )}
            </div>

            {/* PayLater / Credit Card purchase */}
            {type === "expense" && (
              <div className="rounded-lg border p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={isPayLater}
                    onChange={(e) => setIsPayLater(e.target.checked)}
                    className="h-4 w-4"
                  />
                  PayLater purchase (adds to debt)
                </label>
                <p className="text-xs text-muted-foreground">
                  If enabled, this expense will be recorded under your PayLater/Debt account. Your cash accounts won’t go down until you record a payment.
                </p>
                {/* Installment options */}
                {isPayLater && (
                  <div className="space-y-3 pt-3 border-t">
                    <div>
                      <label htmlFor="installments" className="block text-sm font-medium mb-2">
                        Installments
                      </label>
                      <select
                        id="installments"
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary transition-all"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                          <option key={n} value={n}>
                            {n === 1 ? "Pay in full (1 month)" : `${n} months`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="startMonth" className="block text-sm font-medium mb-2">
                        Payment Due (Start Month)
                      </label>
                      <input
                        type="month"
                        id="startMonth"
                        value={startMonth}
                        onChange={(e) => setStartMonth(e.target.value)}
                        className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary transition-all"
                      />
                    </div>
                    {installments > 1 && (
                      <p className="text-xs text-muted-foreground">
                        ₱{(Number(amount) / installments || 0).toFixed(2)} per month for {installments} months
                      </p>
                    )}
                    {installments === 1 && (
                      <p className="text-xs text-muted-foreground">
                        Full payment due in {startMonth}
                      </p>
                    )}
                  </div>
                )}              </div>
            )}

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
              {type === "transfer" ? (
                <input
                  type="text"
                  value="Transfer"
                  readOnly
                  className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 cursor-not-allowed text-muted-foreground"
                />
              ) : (
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="">No category</option>
                  {categories.filter(c => c.type === type).map((c) => (
                    <option value={c.id} key={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
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
