"use client";

import { useCallback, useState } from "react";
import type { CertificationEntry } from "@/types";

interface CertificationsFormProps {
  entries: CertificationEntry[];
  onSave: (entries: CertificationEntry[]) => Promise<void>;
  disabled?: boolean;
}

const EMPTY_ENTRY: Omit<CertificationEntry, "id"> = {
  name: "",
  issuer: "",
  date: "",
};

export default function CertificationsForm({
  entries,
  onSave,
  disabled = false,
}: CertificationsFormProps) {
  const [items, setItems] = useState<CertificationEntry[]>(entries);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const generateId = () => crypto.randomUUID();

  const handleAdd = useCallback(() => {
    const newEntry: CertificationEntry = {
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
    (id: string, field: keyof CertificationEntry, value: string) => {
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
        (item) => item.name.trim() && item.issuer.trim()
      );
      await onSave(validItems);
      setItems(validItems);
      setEditingId(null);
    } catch {
      setError("Failed to save certifications. Please try again.");
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
        <p className="text-sm text-gray-500">No certifications added yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              {editingId === entry.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Certification Name *
                      </label>
                      <input
                        type="text"
                        value={entry.name}
                        onChange={(e) =>
                          handleUpdate(entry.id, "name", e.target.value)
                        }
                        placeholder="e.g., AWS Solutions Architect"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Issuing Organization *
                      </label>
                      <input
                        type="text"
                        value={entry.issuer}
                        onChange={(e) =>
                          handleUpdate(entry.id, "issuer", e.target.value)
                        }
                        placeholder="e.g., Amazon Web Services"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Date Obtained
                      </label>
                      <input
                        type="month"
                        value={entry.date}
                        onChange={(e) =>
                          handleUpdate(entry.id, "date", e.target.value)
                        }
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
                  aria-label={`Edit certification ${entry.name}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        🏅 {entry.name || "Untitled Certification"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {entry.issuer || "Unknown Issuer"}
                        {entry.date && ` · ${entry.date}`}
                      </p>
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
          + Add Certification
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
