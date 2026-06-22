"use client";

import { useCallback, useState } from "react";
import type { WorkPreferences } from "@/types";

interface WorkPreferencesFormProps {
  preferences: WorkPreferences;
  onSave: (preferences: WorkPreferences) => Promise<void>;
  disabled?: boolean;
}

const WORK_MODES = [
  { value: "remote", label: "Remote" },
  { value: "on-site", label: "On-Site" },
  { value: "hybrid", label: "Hybrid" },
] as const;

export default function WorkPreferencesForm({
  preferences,
  onSave,
  disabled = false,
}: WorkPreferencesFormProps) {
  const [workMode, setWorkMode] = useState<WorkPreferences["workMode"]>(
    preferences.workMode
  );
  const [willingToRelocate, setWillingToRelocate] = useState(
    preferences.willingToRelocate ?? false
  );
  const [targetIndustries, setTargetIndustries] = useState<string[]>(
    preferences.targetIndustries ?? []
  );
  const [newIndustry, setNewIndustry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddIndustry = useCallback(() => {
    const trimmed = newIndustry.trim();
    if (!trimmed) return;
    if (targetIndustries.some((i) => i.toLowerCase() === trimmed.toLowerCase())) return;
    setTargetIndustries((prev) => [...prev, trimmed]);
    setNewIndustry("");
  }, [newIndustry, targetIndustries]);

  const handleRemoveIndustry = useCallback((industry: string) => {
    setTargetIndustries((prev) => prev.filter((i) => i !== industry));
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await onSave({
        workMode,
        willingToRelocate,
        targetIndustries,
      });
    } catch {
      setError("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [workMode, willingToRelocate, targetIndustries, onSave]);

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Work Mode */}
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-gray-600">
          Preferred Work Arrangement
        </legend>
        <div className="flex flex-wrap gap-3">
          {WORK_MODES.map((mode) => (
            <label
              key={mode.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                workMode === mode.value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              } ${disabled ? "pointer-events-none opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="workMode"
                value={mode.value}
                checked={workMode === mode.value}
                onChange={() => setWorkMode(mode.value)}
                className="sr-only"
                disabled={disabled}
              />
              {mode.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Willingness to Relocate */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={willingToRelocate}
            onChange={(e) => setWillingToRelocate(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={disabled}
          />
          <span className="text-sm text-gray-700">Willing to relocate</span>
        </label>
      </div>

      {/* Target Industries */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-600">
          Target Industries
        </label>
        {targetIndustries.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {targetIndustries.map((industry) => (
              <span
                key={industry}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {industry}
                <button
                  type="button"
                  onClick={() => handleRemoveIndustry(industry)}
                  disabled={disabled}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200"
                  aria-label={`Remove ${industry}`}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newIndustry}
            onChange={(e) => setNewIndustry(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddIndustry();
              }
            }}
            placeholder="e.g., Technology, Healthcare, Finance"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleAddIndustry}
            disabled={disabled || !newIndustry.trim()}
            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={disabled || saving}
        className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
