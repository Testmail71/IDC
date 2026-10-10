import { requireTeacher } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTeacher();
  return <>{children}</>;
}