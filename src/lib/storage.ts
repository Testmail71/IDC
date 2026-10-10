import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Storage helpers. Private buckets are accessed exclusively through short-lived
 * signed URLs generated server-side, so a user can never download files by
 * guessing a path - the storage SELECT policies and the signed URL both gate
 * access.
 */

export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

export function uniqFileName(name: string): string {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `${suffix}_${safeFileName(name)}`;
}

/** Upload a Buffer via the privileged admin client (server-only). */
export async function uploadBuffer(
  admin: SupabaseClient,
  bucket: string,
  path: string,
  buffer: ArrayBuffer,
  contentType: string,
) {
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

/**
 * Generate a signed URL for reading or downloading. Uses the supplied client,
 * so the request runs under that user's storage policies.
 */
export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function removeFile(
  supabase: SupabaseClient,
  bucket: string,
  path: string | null,
): Promise<void> {
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

export function photoPath(studentId: string, fileName: string): string {
  return `${studentId}/${uniqFileName(fileName)}`;
}

export function examSheetPath(studentId: string, fileName: string): string {
  return `${studentId}/${uniqFileName(fileName)}`;
}

export function certificatePath(studentId: string, fileName: string): string {
  return `${studentId}/${uniqFileName(fileName)}`;
}

export function proofPath(studentId: string, fileName: string): string {
  return `${studentId}/${uniqFileName(fileName)}`;
}

export function materialPath(fileName: string): string {
  return uniqFileName(fileName);
}