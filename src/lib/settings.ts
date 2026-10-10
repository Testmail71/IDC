import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/constants";

export type Settings = Record<string, unknown>;

/**
 * Load portal settings from the DB and merge with defaults, so frontend code
 * never has to guard against a missing key. `portal_settings` SELECT is public
 * by policy, so this works for unauthenticated visitors too.
 */
export async function getSettings(
  supabase: SupabaseClient,
): Promise<Settings> {
  const { data } = await supabase
    .from("portal_settings")
    .select("key, value");

  const merged: Settings = { ...DEFAULT_SETTINGS };
  for (const row of data ?? []) {
    merged[row.key] = row.value;
  }
  return merged;
}

export function settingString(settings: Settings, key: SettingKey): string {
  const value = settings[key];
  return typeof value === "string" ? value : String(DEFAULT_SETTINGS[key] ?? "");
}

export function settingBool(settings: Settings, key: SettingKey): boolean {
  const value = settings[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["true", "1", "yes"].includes(value.toLowerCase());
  return Boolean(DEFAULT_SETTINGS[key]);
}

export function settingNumber(settings: Settings, key: SettingKey): number {
  const value = settings[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(DEFAULT_SETTINGS[key] ?? 0);
  }
  return Number(DEFAULT_SETTINGS[key] ?? 0);
}

/** Requires an authenticated server client with a valid session. */
export async function getTypedSettings(
  supabase: SupabaseClient,
): Promise<{
  templeName: string;
  centerName: string;
  logoPath: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  publicDiscloseStudentName: boolean;
  requirePaymentBeforeCertificate: boolean;
  allowExamWithoutCompletion: boolean;
  studentPhotoLimitMb: number;
  examSheetLimitMb: number;
  certificateLimitMb: number;
  registrationOpen: boolean;
  homepageIntro: string;
  disclaimer: string;
}> {
  const settings = await getSettings(supabase);
  return {
    templeName: settingString(settings, "temple_name"),
    centerName: settingString(settings, "idc_center_name"),
    logoPath: settingString(settings, "logo_path"),
    contactEmail: settingString(settings, "contact_email"),
    contactPhone: settingString(settings, "contact_phone"),
    contactAddress: settingString(settings, "contact_address"),
    publicDiscloseStudentName: settingBool(
      settings,
      "public_disclose_student_name",
    ),
    requirePaymentBeforeCertificate: settingBool(
      settings,
      "require_payment_before_certificate",
    ),
    allowExamWithoutCompletion: settingBool(
      settings,
      "allow_exam_without_completion",
    ),
    studentPhotoLimitMb: settingNumber(settings, "student_photo_limit_mb"),
    examSheetLimitMb: settingNumber(settings, "exam_sheet_limit_mb"),
    certificateLimitMb: settingNumber(settings, "certificate_limit_mb"),
    registrationOpen: settingBool(settings, "registration_open"),
    homepageIntro: settingString(settings, "homepage_intro"),
    disclaimer: settingString(settings, "disclaimer"),
  };
}