import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm, type SettingsFormValues } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth";
import { getTypedSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const settings = await getTypedSettings(supabase);

  const initial: SettingsFormValues = {
    temple_name: settings.templeName,
    idc_center_name: settings.centerName,
    logo_path: settings.logoPath,
    contact_email: settings.contactEmail,
    contact_phone: settings.contactPhone,
    contact_address: settings.contactAddress,
    public_disclose_student_name: settings.publicDiscloseStudentName,
    require_payment_before_certificate: settings.requirePaymentBeforeCertificate,
    allow_exam_without_completion: settings.allowExamWithoutCompletion,
    registration_open: settings.registrationOpen,
    student_photo_limit_mb: settings.studentPhotoLimitMb,
    exam_sheet_limit_mb: settings.examSheetLimitMb,
    certificate_limit_mb: settings.certificateLimitMb,
    homepage_intro: settings.homepageIntro,
    disclaimer: settings.disclaimer,
  };

  const logoUrl = settings.logoPath
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/public-assets/${settings.logoPath}`
    : null;

  return (
    <div>
      <PageHeader
        title="Portal Settings"
        description="Organisation details, branding, registration workflow and file limits."
      />
      <SettingsForm initial={initial} logoUrl={logoUrl} />
    </div>
  );
}