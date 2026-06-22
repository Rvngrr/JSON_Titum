"use client";

import { useCallback, useState } from "react";
import type { WorkExperienceEntry } from "@/types";

interface WorkExperienceFormProps {
  entries: WorkExperienceEntry[];
  onSave: (entries: WorkExperienceEntry[]) => Promise<void>;
  disabled?: boolean;
}

const EMPTY_ENTRY: Omit<WorkExperienceEntry, "id"> = {
  title: "",
  company: "",
  industry: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
};

export default function WorkExperienceForm({
  entries,
  onSave,
  disabled = false,
}: WorkExperienceFormProps) {
  const [items, setItems] = useState<WorkExperienceEntry[]>(entries);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const generateId = () => crypto.randomUUID();

  const handleAdd = useCallback(() => {
    const newEntry: WorkExperienceEntry = {
      ...EMPTY_ENTRY,
      id: generateId(),
    };
    setItems((prev) => [...prev, newEntry]);
    setEditingId(newEntry.id);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setEditingId(null);
  }, []);

  const handleUpdate = useCallback(
    (id: string, field: keyof WorkExperienceEntry, value: string | boolean) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      // Validate entries have required fields
      const validItems = items.filter(
        (item) => item.title.trim() && item.company.trim() && item.startDate
      );
      await onSave(validItems);
      setItems(validItems);
      setEditingId(null);
    } catch {
      setError("Failed to save work experience. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [items, onSave]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No work experience added yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-4 shadow-sm"
            >
              {editingId === entry.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        value={entry.title}
                        onChange={(e) =>
                          handleUpdate(entry.id, "title", e.target.value)
                        }
                        placeholder="e.g., Software Engineer"
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Company *
                      </label>
                      <input
                        type="text"
                        value={entry.company}
                        onChange={(e) =>
                          handleUpdate(entry.id, "company", e.target.value)
                        }
                        placeholder="e.g., Acme Inc."
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Industry
                      </label>
                      <input
                        type="text"
                        value={entry.industry || ""}
                        onChange={(e) =>
                          handleUpdate(entry.id, "industry", e.target.value)
                        }
                        placeholder="e.g., Technology"
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Start Date *
                      </label>
                      <input
                        type="month"
                        value={entry.startDate}
                        onChange={(e) =>
                          handleUpdate(entry.id, "startDate", e.target.value)
                        }
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        End Date
                      </label>
                      <input
                        type="month"
                        value={entry.isCurrent ? "" : entry.endDate || ""}
                        onChange={(e) =>
                          handleUpdate(entry.id, "endDate", e.target.value)
                        }
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        disabled={disabled || entry.isCurrent}
                      />
                      <label className="mt-1 flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={entry.isCurrent || false}
                          onChange={(e) =>
                            handleUpdate(entry.id, "isCurrent", e.target.checked)
                          }
                          className="h-3.5 w-3.5 rounded border-[var(--border-subtle)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          disabled={disabled}
                        />
                        <span className="text-xs text-[var(--text-muted)]">Current position</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                      Description
                    </label>
                    <textarea
                      value={entry.description || ""}
                      onChange={(e) =>
                        handleUpdate(entry.id, "description", e.target.value)
                      }
                      placeholder="Describe your responsibilities and accomplishments..."
                      rows={3}
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      disabled={disabled}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(entry.id)}
                      className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer"
                  onClick={() => setEditingId(entry.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setEditingId(entry.id);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit ${entry.title} at ${entry.company}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {entry.title || "Untitled Position"}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {entry.company || "Unknown Company"}
                        {entry.industry && ` · ${entry.industry}`}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {entry.startDate || "?"} –{" "}
                        {entry.isCurrent
                          ? "Present"
                          : entry.endDate || "?"}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">Click to edit</span>
                  </div>
                  {entry.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
                      {entry.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className="rounded-lg border border-dashed border-[var(--border-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
        >
          + Add Work Experience
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || saving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>
    </div>
  );
}
