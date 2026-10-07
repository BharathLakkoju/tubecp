import BillingPanel from "@/components/BillingPanel";
import AppPage from "@/components/tubecp/AppPage";
import { PageHeading } from "@/components/tubecp/FormKit";

export default function BillingPage() {
  return (
    <AppPage width="reading">
      <div className="flex flex-col gap-6 pt-4">
        <PageHeading
          title="Billing & plans"
          description="Your current plan, renewal date, and subscription options."
        />
        <BillingPanel />
      </div>
    </AppPage>
  );
}
