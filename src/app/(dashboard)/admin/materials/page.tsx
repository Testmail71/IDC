import { MaterialManager } from "@/components/admin/material-manager";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CourseMaterial } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminMaterialsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: materials } = await supabase
    .from("course_materials")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const rows = (materials ?? []) as CourseMaterial[];
  const publishedCount = rows.filter((m) => m.is_published).length;

  return (
    <div>
      <PageHeader
        title="Course Material"
        description={`${rows.length} item${rows.length === 1 ? "" : "s"} · ${publishedCount} published. Published material is downloadable by students whose course fee is fully settled.`}
      />
      <MaterialManager materials={rows} />
    </div>
  );
}
