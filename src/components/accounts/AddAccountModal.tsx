"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";

interface AccountOption {
  type: "cash" | "bank" | "credit_card" | "e_wallet" | "investment";
  icon: string;
  name: string;
  color: string;
  isSavings: boolean;
}

const accountOptions: AccountOption[] = [
  // Wallet Category
  { type: "e_wallet", icon: "gcash.png", name: "GCash", color: "#007DFE", isSavings: false },
  { type: "e_wallet", icon: "maya.png", name: "Maya", color: "#10b981", isSavings: false },
  { type: "bank", icon: "gotyme.png", name: "GoTyme", color: "#06b6d4", isSavings: false },
  { type: "cash", icon: "", name: "Cash on Hand", color: "#86efac", isSavings: false },
  // Savings Category
  { type: "e_wallet", icon: "gcash.png", name: "GCash Savings", color: "#007DFE", isSavings: true },
  { type: "e_wallet", icon: "maya.png", name: "Maya Savings", color: "#10b981", isSavings: true },
  { type: "bank", icon: "gotyme.png", name: "GoTyme Savings", color: "#06b6d4", isSavings: true },
  { type: "bank", icon: "seabank.png", name: "SeaBank Savings", color: "#FF6B00", isSavings: true },
  // PayLater / Debt (tracked as credit_card)
  { type: "credit_card", icon: "Spaylater.avif", name: "SPayLater", color: "#10b981", isSavings: false },
  { type: "credit_card", icon: "Metrobank.webp", name: "Metrobank", color: "#007DFE", isSavings: false },
  { type: "credit_card", icon: "tiktok.png", name: "TikTok PayLater", color: "#000000", isSavings: false },
];

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAccounts: Array<{ icon: string; is_savings: boolean }>;
}

export default function AddAccountModal({ isOpen, onClose, existingAccounts }: AddAccountModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedAccount, setSelectedAccount] = useState<AccountOption | null>(null);
  const [balance, setBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [includeNetworth, setIncludeNetworth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // When account type changes, reset balance and adjust includeNetworth
  React.useEffect(() => {
    if (selectedAccount?.type === "credit_card") {
      setBalance("0");
      setIncludeNetworth(false); // Debt accounts shouldn't increase net worth
    }
  }, [selectedAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        toast({ title: "Not signed in", description: "You must be signed in to add accounts", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("accounts").insert([{
        user_id: session.user.id,
        name: selectedAccount.name,
        type: selectedAccount.type,
        balance: Number(balance || 0),
        currency: "PHP",
        color: selectedAccount.color,
        icon: selectedAccount.icon,
        is_savings: selectedAccount.isSavings,
        interest_rate: selectedAccount.isSavings ? Number(interestRate || 0) : 0,
        include_in_networth: includeNetworth,
      }] as any);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Account added", description: "Your account was created successfully." });
      onClose();
      router.refresh();
    } catch (err) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if an account option is already added (duplicate check)
  const isAccountDisabled = (option: AccountOption) => {
    return existingAccounts.some(
      (acc) => option.icon && acc.icon === option.icon && acc.is_savings === option.isSavings
    );
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
          <h3 className="text-xl font-semibold">Add New Account</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 hover:rotate-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Wallet Category */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Wallet</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {accountOptions
                  .filter((opt) => !opt.isSavings && opt.type !== "credit_card")
                  .map((option, idx) => {
                    const isDisabled = isAccountDisabled(option);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setSelectedAccount(option)}
                        className={`
                          flex flex-col items-center p-4 border-2 rounded-xl transition-all
                          ${isDisabled 
                            ? "opacity-40 cursor-not-allowed border-gray-200 dark:border-slate-700" 
                            : selectedAccount === option
                            ? "border-primary shadow-lg"
                            : "border-gray-200 dark:border-slate-700 hover:border-primary/50"
                          }
                        `}
                        style={
                          !isDisabled && selectedAccount === option
                            ? { borderColor: option.color, boxShadow: `0 4px 12px ${option.color}40` }
                            : {}
                        }
                      >
                        <div className="w-12 h-12 mb-2 flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                          {option.icon ? (
                            <img src={`/logos/${option.icon}`} alt={option.name} className="w-10 h-10 object-contain" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={option.color} strokeWidth="2">
                              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
                              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
                              <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium text-center">{option.name.split(" ")[0]}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Savings Category */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Savings</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {accountOptions
                  .filter((opt) => opt.isSavings)
                  .map((option, idx) => {
                    const isDisabled = isAccountDisabled(option);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setSelectedAccount(option)}
                        className={`
                          flex flex-col items-center p-4 border-2 rounded-xl transition-all
                          ${isDisabled 
                            ? "opacity-40 cursor-not-allowed border-gray-200 dark:border-slate-700" 
                            : selectedAccount === option
                            ? "border-primary shadow-lg"
                            : "border-gray-200 dark:border-slate-700 hover:border-primary/50"
                          }
                        `}
                        style={
                          !isDisabled && selectedAccount === option
                            ? { borderColor: option.color, boxShadow: `0 4px 12px ${option.color}40` }
                            : {}
                        }
                      >
                        <div className="w-12 h-12 mb-2 flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                          {option.icon ? (
                            <img src={`/logos/${option.icon}`} alt={option.name} className="w-10 h-10 object-contain" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={option.color} strokeWidth="2">
                              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
                              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
                              <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium text-center">{option.name.split(" ")[0]}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* PayLater / Debt Category */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">PayLater / Debt</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Track your buy-now-pay-later purchases. Your cash won't decrease until you record a payment.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {accountOptions
                  .filter((opt) => !opt.isSavings && opt.type === "credit_card")
                  .map((option, idx) => {
                    const isDisabled = isAccountDisabled(option);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setSelectedAccount(option)}
                        className={`
                          flex flex-col items-center p-4 border-2 rounded-xl transition-all
                          ${isDisabled 
                            ? "opacity-40 cursor-not-allowed border-gray-200 dark:border-slate-700" 
                            : selectedAccount === option
                            ? "border-primary shadow-lg"
                            : "border-gray-200 dark:border-slate-700 hover:border-primary/50"
                          }
                        `}
                        style={
                          !isDisabled && selectedAccount === option
                            ? { borderColor: option.color, boxShadow: `0 4px 12px ${option.color}40` }
                            : {}
                        }
                      >
                        <div className="w-12 h-12 mb-2 flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                          {option.icon ? (
                            <img src={`/logos/${option.icon}`} alt={option.name} className="w-10 h-10 object-contain" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={option.color} strokeWidth="2">
                              <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                              <path d="M2 10h20"></path>
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-medium text-center leading-tight">{option.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Show form fields only if an account is selected */}
            {selectedAccount && (
              <>
                {/* Include in Net Worth - hide for debt accounts */}
                {selectedAccount.type !== "credit_card" && (
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="includeNetworth"
                      checked={includeNetworth}
                      onChange={(e) => setIncludeNetworth(e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="includeNetworth" className="text-sm font-medium cursor-pointer">
                        Include in Total Net Worth
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Uncheck if you don't want this account counted in your total net worth
                      </p>
                    </div>
                  </div>
                )}

                {/* Initial Balance / Debt */}
                <div>
                  <label htmlFor="balance" className="block text-sm font-medium mb-2">
                    {selectedAccount.type === "credit_card" ? "Initial Debt (if any)" : "Initial Balance"}
                  </label>
                  {selectedAccount.type === "credit_card" && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Usually leave this at 0. Only enter an amount if you already have existing debt to track.
                    </p>
                  )}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₱</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      id="balance"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Interest Rate (only for savings) */}
                {selectedAccount.isSavings && (
                  <div>
                    <label htmlFor="interestRate" className="block text-sm font-medium mb-2">
                      Interest Rate (% per year)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      id="interestRate"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex gap-3 p-6 border-t dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedAccount || isLoading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Adding..." : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
