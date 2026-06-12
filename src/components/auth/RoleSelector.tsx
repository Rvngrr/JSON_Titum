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
      <legend className="text-sm font-medium text-gray-700">
        Select your role
      </legend>
      <div className="flex gap-4">
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 transition-colors ${
            value === "applicant"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-300 hover:border-gray-400"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input
            type="radio"
            name="role"
            value="applicant"
            checked={value === "applicant"}
            onChange={() => onChange("applicant")}
            aria-label="Applicant role"
            className="h-4 w-4 text-blue-600"
          />
          <span className="text-sm font-medium">Applicant</span>
        </label>
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 transition-colors ${
            value === "hr_user"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-300 hover:border-gray-400"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input
            type="radio"
            name="role"
            value="hr_user"
            checked={value === "hr_user"}
            onChange={() => onChange("hr_user")}
            aria-label="HR User role"
            className="h-4 w-4 text-blue-600"
          />
          <span className="text-sm font-medium">HR User</span>
        </label>
      </div>
    </fieldset>
  );
}
