"use client";

import { useCallback, useState } from "react";
import type { EducationEntry } from "@/types";

interface EducationFormProps {
  entries: EducationEntry[];
  onSave: (entries: EducationEntry[]) => Promise<void>;
  disabled?: boolean;
}

const EMPTY_ENTRY: Omit<EducationEntry, "id"> = {
  degree: "",
  institution: "",
  fieldOfStudy: "",
  graduationYear: "",
};

export default function EducationForm({
  entries,
  onSave,
  disabled = false,
}: EducationFormProps) {
  const [items, setItems] = useState<EducationEntry[]>(entries);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const generateId = () => crypto.randomUUID();

  const handleAdd = useCallback(() => {
    const newEntry: EducationEntry = {
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
    (id: string, field: keyof EducationEntry, value: string) => {
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
      const validItems = items.filter(
        (item) => item.degree.trim() && item.institution.trim()
      );
      await onSave(validItems);
      setItems(validItems);
      setEditingId(null);
    } catch {
      setError("Failed to save education. Please try again.");
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
        <p className="text-sm text-[var(--text-muted)]">No education added yet.</p>
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
                        Degree *
                      </label>
                      <input
                        type="text"
                        value={entry.degree}
                        onChange={(e) =>
                          handleUpdate(entry.id, "degree", e.target.value)
                        }
                        placeholder="e.g., Bachelor of Science"
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Institution *
                      </label>
                      <input
                        type="text"
                        value={entry.institution}
                        onChange={(e) =>
                          handleUpdate(entry.id, "institution", e.target.value)
                        }
                        placeholder="e.g., University of the Philippines"
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Field of Study
                      </label>
                      <input
                        type="text"
                        value={entry.fieldOfStudy || ""}
                        onChange={(e) =>
                          handleUpdate(entry.id, "fieldOfStudy", e.target.value)
                        }
                        placeholder="e.g., Computer Science"
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Graduation Year
                      </label>
                      <input
                        type="text"
                        value={entry.graduationYear}
                        onChange={(e) =>
                          handleUpdate(entry.id, "graduationYear", e.target.value)
                        }
                        placeholder="e.g., 2022"
                        maxLength={4}
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        disabled={disabled}
                      />
                    </div>
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
                  aria-label={`Edit ${entry.degree} at ${entry.institution}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {entry.degree || "Untitled Degree"}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {entry.institution || "Unknown Institution"}
                        {entry.fieldOfStudy && ` · ${entry.fieldOfStudy}`}
                      </p>
                      {entry.graduationYear && (
                        <p className="text-xs text-[var(--text-muted)]">
                          Graduated: {entry.graduationYear}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">Click to edit</span>
                  </div>
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
          + Add Education
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
