import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm } from "@/components/student/profile-form";
import { requireStudent } from "@/lib/auth";
import { getStudentByUser, getStudentPhotoUrl } from "@/lib/queries";
import { cacheSettings } from "@/lib/settings-cache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const session = await requireStudent();
  const supabase = await createClient();
  const student = await getStudentByUser(supabase, session.user.id);

  if (!student) {
    return (
      <Alert variant="warning" title="Profile not found">
        Your student record could not be found. Please contact the administrator.
      </Alert>
    );
  }

  const [photoUrl, settings] = await Promise.all([
    getStudentPhotoUrl(supabase, student.photo_path),
    cacheSettings(),
  ]);

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Keep your contact and address details up to date."
      />
      <div className="max-w-3xl">
        <ProfileForm
          student={student}
          photoUrl={photoUrl}
          userId={session.user.id}
          maxPhotoMb={settings.studentPhotoLimitMb}
        />
      </div>
    </div>
  );
}