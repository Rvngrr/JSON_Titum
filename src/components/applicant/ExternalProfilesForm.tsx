"use client";

import { useCallback, useState } from "react";
import type { ExternalUrls } from "@/types";

interface ExternalProfilesFormProps {
  urls: ExternalUrls;
  onSave: (urls: ExternalUrls) => Promise<void>;
  disabled?: boolean;
}

const URL_FIELDS = [
  {
    key: "linkedin" as const,
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/your-profile",
    icon: "🔗",
  },
  {
    key: "github" as const,
    label: "GitHub",
    placeholder: "https://github.com/your-username",
    icon: "💻",
  },
  {
    key: "portfolio" as const,
    label: "Portfolio",
    placeholder: "https://your-portfolio.com",
    icon: "🌐",
  },
];

export default function ExternalProfilesForm({
  urls,
  onSave,
  disabled = false,
}: ExternalProfilesFormProps) {
  const [linkedin, setLinkedin] = useState(urls.linkedin ?? "");
  const [github, setGithub] = useState(urls.github ?? "");
  const [portfolio, setPortfolio] = useState(urls.portfolio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getters = { linkedin, github, portfolio };
  const setters = {
    linkedin: setLinkedin,
    github: setGithub,
    portfolio: setPortfolio,
  };

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await onSave({
        linkedin: linkedin.trim() || undefined,
        github: github.trim() || undefined,
        portfolio: portfolio.trim() || undefined,
      });
    } catch {
      setError("Failed to save external profiles. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [linkedin, github, portfolio, onSave]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {URL_FIELDS.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`external-url-${field.key}`}
              className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600"
            >
              <span>{field.icon}</span>
              {field.label}
            </label>
            <input
              id={`external-url-${field.key}`}
              type="url"
              value={getters[field.key]}
              onChange={(e) => setters[field.key](e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={disabled || saving}
        className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Links"}
      </button>
    </div>
  );
}
