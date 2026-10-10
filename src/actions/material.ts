"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { materialSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/constants";
import { removeFile } from "@/lib/storage";
import type { ActionResult } from "@/actions/student";

const MATERIAL_REVALIDATE = ["/admin/materials", "/student/materials"];

/** Register a course material that has already been uploaded to storage. */
export async function createMaterialAction(input: {
  title: string;
  description?: string;
  filePath: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  isPublished?: boolean;
  sortOrder?: number;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  if (!input.filePath || input.filePath.includes("/")) {
    return { error: "Invalid file path." };
  }

  const parsed = materialSchema.safeParse({
    title: input.title,
    description: input.description ?? "",
    is_published: input.isPublished ?? false,
    sort_order: input.sortOrder ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid material details." };
  }

  const { data: inserted, error } = await supabase
    .from("course_materials")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      file_path: input.filePath,
      file_name: input.fileName ?? null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType ?? "application/pdf",
      is_published: parsed.data.is_published ?? false,
      sort_order: parsed.data.sort_order ?? 0,
      uploaded_by: session.user.id,
    })
    .select("id")
    .single();
  if (error) {
    await removeFile(supabase, BUCKETS.materials, input.filePath);
    return { error: error.message };
  }

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.MATERIAL_UPLOADED,
    entityType: "course_material",
    entityId: inserted.id,
    description: `Uploaded course material "${parsed.data.title}"`,
  });

  for (const path of MATERIAL_REVALIDATE) revalidatePath(path);
  return { ok: true, message: "Course material uploaded." };
}

export async function updateMaterialAction(
  materialId: string,
  input: {
    title: string;
    description?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const parsed = materialSchema.safeParse({
    title: input.title,
    description: input.description ?? "",
    is_published: input.isPublished ?? false,
    sort_order: input.sortOrder ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid material details." };
  }

  const { error } = await supabase
    .from("course_materials")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      is_published: parsed.data.is_published ?? false,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .eq("id", materialId);
  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.MATERIAL_UPDATED,
    entityType: "course_material",
    entityId: materialId,
    description: `Updated course material "${parsed.data.title}"`,
    metadata: { is_published: parsed.data.is_published ?? false },
  });

  for (const path of MATERIAL_REVALIDATE) revalidatePath(path);
  return { ok: true, message: "Course material updated." };
}

export async function toggleMaterialPublishedAction(
  materialId: string,
  isPublished: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("course_materials")
    .select("title")
    .eq("id", materialId)
    .maybeSingle();
  if (!material) return { error: "Course material not found." };

  const { error } = await supabase
    .from("course_materials")
    .update({ is_published: isPublished })
    .eq("id", materialId);
  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.MATERIAL_UPDATED,
    entityType: "course_material",
    entityId: materialId,
    description: `${isPublished ? "Published" : "Unpublished"} course material "${material.title}"`,
    metadata: { is_published: isPublished },
  });

  for (const path of MATERIAL_REVALIDATE) revalidatePath(path);
  return {
    ok: true,
    message: isPublished ? "Material published." : "Material unpublished.",
  };
}

export async function deleteMaterialAction(materialId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("course_materials")
    .select("title, file_path")
    .eq("id", materialId)
    .maybeSingle();
  if (!material) return { error: "Course material not found." };

  const { error } = await supabase
    .from("course_materials")
    .delete()
    .eq("id", materialId);
  if (error) return { error: error.message };

  await removeFile(supabase, BUCKETS.materials, material.file_path);

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.MATERIAL_DELETED,
    entityType: "course_material",
    entityId: materialId,
    description: `Deleted course material "${material.title}"`,
  });

  for (const path of MATERIAL_REVALIDATE) revalidatePath(path);
  return { ok: true, message: "Course material deleted." };
}
