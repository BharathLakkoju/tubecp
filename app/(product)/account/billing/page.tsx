import BillingPanel from "@/components/BillingPanel";
import MobileNavToggle from "@/components/MobileNavToggle";

export default function BillingPage() {
  return (
    <div className="app-panel">
      <div className="app-panel-scroll">
        <header className="mb-6 border-b border-border pb-4">
          <div className="app-inline-header-row">
            <MobileNavToggle />
            <div className="app-inline-header-text">
              <h1 className="font-sans text-lg font-semibold text-text">
                Billing &amp; plans
              </h1>
              <p className="mt-2 font-sans text-sm text-text-muted">
                Your current plan, renewal date, and subscription options.
              </p>
            </div>
          </div>
        </header>
        <BillingPanel />
      </div>
    </div>
  );
}
