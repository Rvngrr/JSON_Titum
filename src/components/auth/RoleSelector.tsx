"use client";

export type UserRole = "applicant" | "hr_user";

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}

export default function RoleSelector({
  value,
  onChange,
  disabled = false,
}: RoleSelectorProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-[var(--text-primary)]">
        Select your role
      </legend>
      <div className="flex gap-3">
        <label
          className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 transition-all ${
            value === "applicant"
              ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
              : "border-[var(--border-input)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input
            type="radio"
            name="role"
            value="applicant"
            checked={value === "applicant"}
            onChange={() => onChange("applicant")}
            aria-label="Applicant role"
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-sm font-medium">Applicant</span>
        </label>
        <label
          className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 transition-all ${
            value === "hr_user"
              ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
              : "border-[var(--border-input)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input
            type="radio"
            name="role"
            value="hr_user"
            checked={value === "hr_user"}
            onChange={() => onChange("hr_user")}
            aria-label="Job Curator role"
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-sm font-medium">Job Curator</span>
        </label>
      </div>
    </fieldset>
  );
}
