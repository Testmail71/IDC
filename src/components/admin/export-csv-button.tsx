"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";

export function ExportCsvButton({
  rows,
  filename,
  label = "Export CSV",
}: {
  rows: Record<string, unknown>[];
  filename: string;
  label?: string;
}) {
  return (
    <Button
      variant="outline"
      onClick={() => downloadCsv(rows, filename)}
      disabled={rows.length === 0}
    >
      <Download className="h-4 w-4" /> {label}
    </Button>
  );
}