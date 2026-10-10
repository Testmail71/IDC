"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, FileText, FileUp, Pencil, Trash2 } from "lucide-react";

import {
  createMaterialAction,
  deleteMaterialAction,
  toggleMaterialPublishedAction,
  updateMaterialAction,
} from "@/actions/material";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { BUCKETS, DEFAULT_MATERIAL_LIMIT_MB } from "@/lib/constants";
import { materialPath } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { CourseMaterial } from "@/lib/types";

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MaterialManager({
  materials,
  maxMb = DEFAULT_MATERIAL_LIMIT_MB,
}: {
  materials: CourseMaterial[];
  maxMb?: number;
}) {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [publishNow, setPublishNow] = React.useState(true);
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);

  const [editTarget, setEditTarget] = React.useState<CourseMaterial | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<CourseMaterial | null>(null);

  function resetForm() {
    setTitle("");
    setDescription("");
    setPublishNow(true);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setMessage({ type: "error", text: "Choose a PDF file to upload." });
    if (file.type !== "application/pdf") {
      return setMessage({ type: "error", text: "Course material must be a PDF file." });
    }
    if (file.size > maxMb * 1024 * 1024) {
      return setMessage({ type: "error", text: `File must be smaller than ${maxMb} MB.` });
    }
    if (title.trim().length < 3) {
      return setMessage({ type: "error", text: "Enter a title of at least 3 characters." });
    }

    setPending("upload");
    setMessage(null);
    try {
      const supabase = createClient();
      const path = materialPath(file.name);
      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.materials)
        .upload(path, file, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw uploadError;

      const res = await createMaterialAction({
        title,
        description,
        filePath: path,
        fileName: file.name,
        fileSize: file.size,
        mimeType: "application/pdf",
        isPublished: publishNow,
      });
      if (res.error) throw new Error(res.error);

      setMessage({ type: "success", text: res.message ?? "Course material uploaded." });
      resetForm();
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Upload failed.",
      });
    } finally {
      setPending(null);
    }
  }

  async function togglePublish(m: CourseMaterial) {
    setPending(m.id);
    setMessage(null);
    const res = await toggleMaterialPublishedAction(m.id, !m.is_published);
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Updated." });
    router.refresh();
  }

  async function saveEdit() {
    if (!editTarget) return;
    setPending(editTarget.id);
    setMessage(null);
    const res = await updateMaterialAction(editTarget.id, {
      title: editTitle,
      description: editDescription,
      isPublished: editTarget.is_published,
      sortOrder: editTarget.sort_order,
    });
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Updated." });
    setEditTarget(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setPending(deleteTarget.id);
    setMessage(null);
    const res = await deleteMaterialAction(deleteTarget.id);
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Deleted." });
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {message && (
        <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
      )}

      <div className="rounded-lg border border-stone-200 p-4">
        <p className="mb-3 text-sm font-semibold text-stone-700">Upload new course material</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="mat_title">
            <Input
              id="mat_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Class 1 — The Guru-Disciple Relationship"
            />
          </Field>
          <Field label="PDF file" htmlFor="mat_file" hint={`PDF · max ${maxMb} MB`}>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                id="mat_file"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4" /> Choose file
              </Button>
              <span className="truncate text-sm text-stone-500">
                {fileName ?? "No file chosen"}
              </span>
            </div>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Description (optional)" htmlFor="mat_desc">
            <Textarea
              id="mat_desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short note students will see alongside the download."
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 accent-saffron-600"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
            />
            Publish immediately (visible to fully-paid students)
          </label>
          <Button loading={pending === "upload"} onClick={upload}>
            <FileUp className="h-4 w-4" /> Upload material
          </Button>
        </div>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          title="No course material yet"
          description="Upload a PDF study material above. Students whose fee is fully settled will see published material in their portal."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <Table>
            <THead>
              <TR>
                <TH>Title</TH>
                <TH>File</TH>
                <TH>Visibility</TH>
                <TH>Uploaded</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {materials.map((m) => (
                <TR key={m.id}>
                  <TD>
                    <span className="flex items-center gap-2 font-medium text-stone-900">
                      <FileText className="h-4 w-4 shrink-0 text-maroon-700" />
                      {m.title}
                    </span>
                    {m.description && (
                      <span className="mt-0.5 block max-w-md truncate text-xs text-stone-400">
                        {m.description}
                      </span>
                    )}
                  </TD>
                  <TD>
                    <span className="block max-w-[16rem] truncate text-xs text-stone-500">
                      {m.file_name ?? "material.pdf"}
                    </span>
                    <span className="text-xs text-stone-400">{formatSize(m.file_size)}</span>
                  </TD>
                  <TD>
                    {m.is_published ? (
                      <Badge tone="green">Published</Badge>
                    ) : (
                      <Badge tone="stone">Draft</Badge>
                    )}
                  </TD>
                  <TD className="text-sm text-stone-500">{formatDate(m.created_at)}</TD>
                  <TD>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={pending === m.id}
                        onClick={() => togglePublish(m)}
                      >
                        {m.is_published ? (
                          <>
                            <EyeOff className="h-4 w-4" /> Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" /> Publish
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditTarget(m);
                          setEditTitle(m.title);
                          setEditDescription(m.description ?? "");
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleteTarget(m)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit course material"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button loading={pending === editTarget?.id} onClick={saveEdit}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" htmlFor="edit_mat_title">
            <Input
              id="edit_mat_title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </Field>
          <Field label="Description" htmlFor="edit_mat_desc">
            <Textarea
              id="edit_mat_desc"
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete course material"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending === deleteTarget?.id}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-stone-600">
          Delete <strong>{deleteTarget?.title}</strong>? The PDF will be removed and students will
          no longer be able to download it. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
