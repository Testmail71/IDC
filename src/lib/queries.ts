import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Course,
  CourseProgress,
  Student,
  StudentFinance,
} from "@/lib/types";

export interface StudentProgressBundle {
  enrollmentId: string;
  enrolledAt: string;
  course: Pick<Course, "id" | "code" | "name" | "total_classes"> | null;
  progress: CourseProgress | null;
}

export async function getStudentByUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Student | null> {
  const { data } = await supabase
    .from("students")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return (data as Student) ?? null;
}

export async function getStudentFinance(
  supabase: SupabaseClient,
  studentId: string,
): Promise<StudentFinance | null> {
  const { data } = await supabase
    .from("v_student_finance")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data as StudentFinance) ?? null;
}

export async function getStudentProgress(
  supabase: SupabaseClient,
  studentId: string,
): Promise<StudentProgressBundle | null> {
  const { data } = await supabase
    .from("course_enrollments")
    .select(
      "id, enrolled_at, course:courses(id, code, name, total_classes), progress:course_progress(*)",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const row = data as unknown as {
    id: string;
    enrolled_at: string;
    course: Pick<Course, "id" | "code" | "name" | "total_classes"> | null;
    progress: CourseProgress | CourseProgress[] | null;
  };

  const progress = Array.isArray(row.progress) ? row.progress[0] ?? null : row.progress;

  return {
    enrollmentId: row.id,
    enrolledAt: row.enrolled_at,
    course: row.course,
    progress,
  };
}

export async function getTeacherName(
  supabase: SupabaseClient,
  teacherId: string | null | undefined,
): Promise<string | null> {
  if (!teacherId) return null;
  const { data } = await supabase
    .from("teachers")
    .select("full_name")
    .eq("id", teacherId)
    .maybeSingle();
  return data?.full_name ?? null;
}

export async function getStudentPhotoUrl(
  supabase: SupabaseClient,
  photoPath: string | null | undefined,
): Promise<string | null> {
  if (!photoPath) return null;
  const { data } = await supabase.storage
    .from("student-photos")
    .createSignedUrl(photoPath, 3600);
  return data?.signedUrl ?? null;
}