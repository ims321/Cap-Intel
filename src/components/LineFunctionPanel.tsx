import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCopy,
  FileUp,
  Send,
  Users,
} from 'lucide-react';
import {
  createDefaultLineFunctionTasks,
  getLineFunctionCompleteness,
} from '../data/joburgData';
import type {
  LineFunctionDept,
  LineFunctionStatus,
  LineFunctionTask,
  Project,
  Role,
  UploadedProjectDoc,
} from '../types/capital';
import { hashFileOrText } from '../utils/fileHash';

interface LineFunctionPanelProps {
  project: Project;
  role: Role;
  focusedDept?: LineFunctionDept | null;
  onUpdateTask: (
    projectId: string,
    dept: LineFunctionDept,
    updatedTask: LineFunctionTask,
    attachedDoc?: UploadedProjectDoc
  ) => void;
  onToast?: (msg: string) => void;
}

const STATUS_STYLE: Record<LineFunctionStatus, string> = {
  Requested: 'border-rose-400/35 bg-rose-400/10 text-rose-200',
  Drafted: 'border-amber-400/35 bg-amber-400/10 text-amber-200',
  'Dept Verified': 'border-teal-400/40 bg-teal-400/12 text-teal-200',
  'Executive Approved': 'border-emerald-400/45 bg-emerald-400/15 text-emerald-200',
};

export function LineFunctionPanel({
  project,
  role,
  focusedDept,
  onUpdateTask,
  onToast,
}: LineFunctionPanelProps) {
  const tasks =
    project.lineFunctionTasks && project.lineFunctionTasks.length > 0
      ? project.lineFunctionTasks
      : createDefaultLineFunctionTasks(
          project.cojEntity || project.jurisdiction,
          project.stage
        );

  const completeness = getLineFunctionCompleteness(tasks);
  const [editingDept, setEditingDept] = useState<LineFunctionDept | null>(
    focusedDept || null
  );
  const [draftTask, setDraftTask] = useState<LineFunctionTask | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [copiedLinkDept, setCopiedLinkDept] = useState<LineFunctionDept | null>(null);

  useEffect(() => {
    if (focusedDept) {
      const target = tasks.find((t) => t.dept === focusedDept);
      if (target) {
        setEditingDept(focusedDept);
        setDraftTask({
          ...target,
          requestedFields: target.requestedFields.map((f) => ({ ...f })),
        });
      }
    }
  }, [focusedDept, project.id]);

  const openEditor = (task: LineFunctionTask) => {
    if (editingDept === task.dept) {
      setEditingDept(null);
      setDraftTask(null);
      setPendingFile(null);
      return;
    }
    setEditingDept(task.dept);
    setDraftTask({
      ...task,
      requestedFields: task.requestedFields.map((f) => ({ ...f })),
    });
    setPendingFile(null);
  };

  const handleCopyScopedLink = (dept: LineFunctionDept) => {
    const base =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : '';
    const link = `${base}?role=borrower&tab=workspace&intake=${encodeURIComponent(
      project.id
    )}&dept=${encodeURIComponent(dept)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(link).catch(() => {});
    }
    setCopiedLinkDept(dept);
    onToast?.(
      `Copied scoped line-function intake link (${dept}) for ${project.name}.`
    );
    window.setTimeout(() => setCopiedLinkDept(null), 2500);
  };

  const handleSaveTask = async (nextStatus?: LineFunctionStatus) => {
    if (!draftTask) return;
    let docRecord: UploadedProjectDoc | undefined;
    if (pendingFile) {
      const sha256 = await hashFileOrText(pendingFile);
      docRecord = {
        id: `lf-doc-${Date.now().toString().slice(-5)}`,
        name: pendingFile.name,
        folder:
          draftTask.dept === 'engineering'
            ? '02-Technical & EPC'
            : draftTask.dept === 'finance'
              ? '03-Financial'
              : draftTask.dept === 'esg'
                ? '04-E&S'
                : '01-Mandate & Legal',
        sizeBytes: pendingFile.size,
        mimeType: pendingFile.type || 'application/octet-stream',
        sha256,
        uploadedAt: '2026-11-24',
        uploadedBy: `${draftTask.assigneeName} (${draftTask.label})`,
      };
    }

    onUpdateTask(
      project.id,
      draftTask.dept,
      {
        ...draftTask,
        status: nextStatus || draftTask.status,
        updatedAt: '2026-11-24',
      },
      docRecord
    );
    setEditingDept(null);
    setDraftTask(null);
    setPendingFile(null);
  };

  return (
    <div
      data-testid="line-function-panel"
      className="min-w-0 rounded-xl border border-amber-400/25 bg-[#0b1424] p-4 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Executive-to-Line-Function Technical Collaboration Desk</span>
          </div>
          <h3 className="font-display mt-1 text-xl font-medium text-slate-100">
            Departmental Engineering, Treasury, Legal &amp; E&amp;S Sign-Offs
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Executives steer structuring and capital mobilization while line functionaries populate technical BOQs, NRW baselines, MTREF votes, and environmental licenses via scoped intake forms.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#08111e] px-4 py-2.5 text-right shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Line-Function Readiness
          </div>
          <div
            data-testid="line-function-readiness-pct"
            className="font-mono-num text-xl font-bold text-teal-300"
          >
            {completeness.verifiedCount}/{completeness.total} Verified ({completeness.pct}%)
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
          style={{ width: `${completeness.pct}%` }}
        />
      </div>

      {/* 4 Department Workstream Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {tasks.map((task) => {
          const isEditing = editingDept === task.dept && draftTask;
          return (
            <div
              key={task.dept}
              className={`min-w-0 rounded-xl border p-4 transition-colors ${
                isEditing
                  ? 'border-amber-400/60 bg-[#0e1b30]'
                  : 'border-white/10 bg-[#08111e]'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-100">
                    {task.label}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-400">
                    {task.assigneeName} · {task.assigneeRole}
                  </div>
                </div>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    STATUS_STYLE[task.status]
                  }`}
                >
                  {task.status}
                </span>
              </div>

              {!isEditing ? (
                <>
                  <dl className="mt-3 space-y-1.5 border-t border-white/8 pt-2.5 text-xs">
                    {task.requestedFields.map((field) => (
                      <div
                        key={field.key}
                        className="flex items-baseline justify-between gap-2"
                      >
                        <dt className="text-slate-400 truncate">{field.label}</dt>
                        <dd className="font-mono-num font-semibold text-slate-100 text-right">
                          {field.value || 'Pending'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {task.notes && (
                    <p className="mt-2.5 text-[11px] text-slate-400">
                      Note: {task.notes}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3">
                    <button
                      type="button"
                      onClick={() => openEditor(task)}
                      className="rounded-lg bg-amber-400/15 border border-amber-400/40 px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/25 whitespace-nowrap shrink-0"
                    >
                      Open Line-Function Form
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyScopedLink(task.dept)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/5 whitespace-nowrap shrink-0"
                    >
                      <ClipboardCopy className="h-3 w-3" aria-hidden="true" />
                      {copiedLinkDept === task.dept ? 'Copied Link ✓' : 'Copy Scoped Link'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3 space-y-3 border-t border-white/10 pt-3 text-xs">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
                        Line Officer Name
                      </label>
                      <input
                        type="text"
                        value={draftTask.assigneeName}
                        onChange={(e) =>
                          setDraftTask({ ...draftTask, assigneeName: e.target.value })
                        }
                        className="w-full rounded border border-white/15 bg-[#0b1424] px-2.5 py-1.5 text-xs text-slate-100 focus:border-amber-400/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
                        Workstream Status
                      </label>
                      <select
                        value={draftTask.status}
                        onChange={(e) =>
                          setDraftTask({
                            ...draftTask,
                            status: e.target.value as LineFunctionStatus,
                          })
                        }
                        className="w-full rounded border border-white/15 bg-[#0b1424] px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                      >
                        <option value="Requested">Requested</option>
                        <option value="Drafted">Drafted</option>
                        <option value="Dept Verified">Dept Verified</option>
                        {role === 'borrower' && (
                          <option value="Executive Approved">Executive Approved</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {draftTask.requestedFields.map((field, idx) => (
                    <div key={field.key}>
                      <label className="mb-1 block text-[11px] font-medium text-slate-300">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => {
                          const nextFields = draftTask.requestedFields.map((f, i) =>
                            i === idx ? { ...f, value: e.target.value } : f
                          );
                          setDraftTask({ ...draftTask, requestedFields: nextFields });
                        }}
                        placeholder={field.placeholder || 'Enter verified line data'}
                        className="w-full rounded border border-white/15 bg-[#0b1424] px-2.5 py-1.5 text-xs text-slate-100 focus:border-teal-400/60 focus:outline-none"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-300">
                      Technical / Compliance Verification Notes
                    </label>
                    <textarea
                      rows={2}
                      value={draftTask.notes || ''}
                      onChange={(e) =>
                        setDraftTask({ ...draftTask, notes: e.target.value })
                      }
                      className="w-full rounded border border-white/15 bg-[#0b1424] px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-white/15 px-2.5 py-1 text-[11px] text-slate-200 hover:border-teal-400/40">
                      <FileUp className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                      <span>
                        {pendingFile ? pendingFile.name : 'Attach Verification File'}
                      </span>
                      <input
                        type="file"
                        onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditor(task)}
                        className="rounded border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveTask()}
                        className="inline-flex items-center gap-1 rounded bg-teal-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-teal-300"
                      >
                        <Send className="h-3 w-3" aria-hidden="true" />
                        Save Update
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveTask('Dept Verified')}
                        className="inline-flex items-center gap-1 rounded bg-emerald-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-300"
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        Mark Verified
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
