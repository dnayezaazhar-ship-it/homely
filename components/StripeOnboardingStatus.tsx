"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type StripeStatus = {
  accountCreated: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

const emptyStatus: StripeStatus = {
  accountCreated: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  detailsSubmitted: false,
};

export default function StripeOnboardingStatus() {
  const [status, setStatus] = useState<StripeStatus>(emptyStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/connect/status", { cache: "no-store" });
      const result = await response.json() as Partial<StripeStatus> & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "We could not load your Stripe status.");
      setStatus({
        accountCreated: result.accountCreated === true,
        chargesEnabled: result.chargesEnabled === true,
        payoutsEnabled: result.payoutsEnabled === true,
        detailsSubmitted: result.detailsSubmitted === true,
      });
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "We could not load your Stripe status.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadStatus(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadStatus]);

  const continueOnboarding = () => { window.location.assign(new URL("/api/stripe/connect/onboarding", window.location.origin).toString()); };
  const badge = (label: string, active: boolean) => <button className={active ? "stripe-status-pill active" : "stripe-status-pill"} type="button" onClick={continueOnboarding} aria-label={`${label}: ${active ? "enabled" : "needs attention"}`}>{label}</button>;

  return <>
    <div className="stripe-status-pills" aria-live="polite">
      {isLoading ? <span className="stripe-status-loading">Loading Stripe status...</span> : <>{badge("Account created", status.accountCreated)}{badge("Charges enabled", status.chargesEnabled)}{badge("Payouts enabled", status.payoutsEnabled)}{badge("Details submitted", status.detailsSubmitted)}</>}
    </div>
    {error && <p className="stripe-status-error" role="alert">{error}</p>}
    <button className="stripe-refresh-button" type="button" onClick={() => void loadStatus()} disabled={isLoading}><RefreshCw size={14} /> {isLoading ? "Refreshing..." : "Refresh status"}</button>
  </>;
}
