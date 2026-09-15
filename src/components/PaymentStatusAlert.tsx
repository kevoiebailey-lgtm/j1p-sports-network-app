import React from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function PaymentStatusAlert() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") || searchParams.get("registration") || searchParams.get("payment");

  if (!status) return null;

  if (status === "success" || status === "balance_success") {
    return (
      <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
        <div className="flex items-center gap-2 font-bold text-base">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>Payment Confirmed!</span>
        </div>
        <p className="mt-1 text-sm text-emerald-300/80">
          Your team registration is complete. Check your team list below for your QR verification token.
        </p>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-400">
        <div className="flex items-center gap-2 font-bold text-base">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <span>Checkout Cancelled</span>
        </div>
        <p className="mt-1 text-sm text-amber-300/80">
          No charges were made. You can reopen the registration when ready.
        </p>
      </div>
    );
  }

  return null;
}

export default PaymentStatusAlert;
