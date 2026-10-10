import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default function StudentChangePasswordPage() {
  return (
    <div>
      <PageHeader
        title="Change Password"
        description="Update the password used to sign in to your account."
      />
      <ChangePasswordForm />
    </div>
  );
}