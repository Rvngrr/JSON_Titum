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
        <p className="text-sm text-gray-500">No education added yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              {editingId === entry.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Degree *
                      </label>
                      <input
                        type="text"
                        value={entry.degree}
                        onChange={(e) =>
                          handleUpdate(entry.id, "degree", e.target.value)
                        }
                        placeholder="e.g., Bachelor of Science"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Institution *
                      </label>
                      <input
                        type="text"
                        value={entry.institution}
                        onChange={(e) =>
                          handleUpdate(entry.id, "institution", e.target.value)
                        }
                        placeholder="e.g., University of the Philippines"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Field of Study
                      </label>
                      <input
                        type="text"
                        value={entry.fieldOfStudy || ""}
                        onChange={(e) =>
                          handleUpdate(entry.id, "fieldOfStudy", e.target.value)
                        }
                        placeholder="e.g., Computer Science"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
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
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(entry.id)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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
                      <p className="text-sm font-medium text-gray-900">
                        {entry.degree || "Untitled Degree"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {entry.institution || "Unknown Institution"}
                        {entry.fieldOfStudy && ` · ${entry.fieldOfStudy}`}
                      </p>
                      {entry.graduationYear && (
                        <p className="text-xs text-gray-400">
                          Graduated: {entry.graduationYear}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">Click to edit</span>
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
          className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
        >
          + Add Education
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>
    </div>
  );
}
