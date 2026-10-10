import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FeeSettingsForm, type FeeSettingsValues } from "@/components/admin/fee-settings-form";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toDateInputValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminFeesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: fee } = await supabase
    .from("course_fee_settings")
    .select("*")
    .eq("is_active", true)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initial: FeeSettingsValues = {
    standardFee: Number(fee?.standard_fee ?? 1500),
    currency: fee?.currency ?? "INR",
    registrationFee: Number(fee?.registration_fee ?? 0),
    additionalCharges: Number(fee?.additional_charges ?? 0),
    lateFee: Number(fee?.late_fee ?? 0),
    lateFeeEnabled: fee?.late_fee_enabled ?? false,
    requirePaymentBeforeCertificate: fee?.require_payment_before_certificate ?? true,
    paymentInstructions: fee?.payment_instructions ?? "",
    discountRules: fee?.discount_rules ?? "",
    refundPolicy: fee?.refund_policy ?? "",
    dueDate: toDateInputValue(fee?.due_date ?? null),
    effectiveDate: toDateInputValue(fee?.effective_date ?? new Date()),
  };

  return (
    <div>
      <PageHeader
        title="Fee Settings"
        description="Configure the course fee applied to newly approved students."
      />
      <Card>
        <CardContent className="p-5">
          <FeeSettingsForm initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}