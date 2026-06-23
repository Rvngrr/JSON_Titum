"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

// ============================================================================
// Types
// ============================================================================

interface PersonalInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
}

interface Organization {
  name: string;
  type: string;
  size: string;
  website: string;
}

interface EmployerEntry {
  id: string;
  employerName: string;
  industry: string;
  contactPerson: string;
  activeJobs: number;
  totalJobsPosted: number;
  status: "Active" | "Inactive" | "Pending";
}

interface HRProfileData {
  personal: PersonalInfo;
  organization: Organization;
  employers: EmployerEntry[];
}

// ============================================================================
// Component
// ============================================================================

export default function HRProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState<HRProfileData>({
    personal: { name: "", title: "", email: "", phone: "" },
    organization: { name: "", type: "", size: "", website: "" },
    employers: [],
  });
  const [jobStats, setJobStats] = useState({ published: 0, draft: 0, closed: 0, total: 0 });

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Load profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // Load HR-specific metadata if stored
        const { data: hrMeta } = await supabase
          .from("skill_profiles")
          .select("work_preferences")
          .eq("user_id", user.id)
          .single();

        const meta = (hrMeta?.work_preferences as Record<string, unknown>) || {};

        setProfileData({
          personal: {
            name: profile?.name || user.user_metadata?.name || "",
            title: (meta.jobTitle as string) || "",
            email: profile?.email || user.email || "",
            phone: (meta.phone as string) || "",
          },
          organization: {
            name: (meta.orgName as string) || "",
            type: (meta.orgType as string) || "",
            size: (meta.orgSize as string) || "",
            website: (meta.orgWebsite as string) || "",
          },
          employers: ((meta.employers as EmployerEntry[]) || []),
        });

        // Load job stats
        const { data: jobs } = await supabase
          .from("job_descriptions")
          .select("status")
          .eq("hr_user_id", user.id);

        if (jobs) {
          setJobStats({
            published: jobs.filter((j) => j.status === "published").length,
            draft: jobs.filter((j) => j.status === "draft").length,
            closed: jobs.filter((j) => j.status === "closed").length,
            total: jobs.length,
          });
        }
      } catch (err) {
        console.error("Failed to load HR profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update profile name
      await supabase
        .from("profiles")
        .update({ name: profileData.personal.name, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      // Store HR metadata in skill_profiles.work_preferences
      const metaPayload = {
        jobTitle: profileData.personal.title,
        phone: profileData.personal.phone,
        orgName: profileData.organization.name,
        orgType: profileData.organization.type,
        orgSize: profileData.organization.size,
        orgWebsite: profileData.organization.website,
        employers: profileData.employers,
      };

      await supabase
        .from("skill_profiles")
        .upsert(
          { user_id: user.id, work_preferences: metaPayload, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );

      setEditMode(false);
    } catch (err) {
      console.error("Failed to save HR profile:", err);
    } finally {
      setSaving(false);
    }
  }, [profileData]);

  const addEmployer = () => {
    setProfileData((prev) => ({
      ...prev,
      employers: [
        ...prev.employers,
        { id: crypto.randomUUID(), employerName: "", industry: "", contactPerson: "", activeJobs: 0, totalJobsPosted: 0, status: "Active" },
      ],
    }));
  };

  const removeEmployer = (id: string) => {
    setProfileData((prev) => ({
      ...prev,
      employers: prev.employers.filter((e) => e.id !== id),
    }));
  };

  const updateEmployer = (id: string, field: keyof EmployerEntry, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      employers: prev.employers.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    }));
  };

  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="flex items-center justify-center py-12">
          <svg className="h-6 w-6 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading profile...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage your personal and organization details.
          </p>
        </div>
        <button
          type="button"
          onClick={editMode ? handleSave : () => setEditMode(true)}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : editMode ? (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </>
          )}
        </button>
      </motion.div>

      {/* Job Stats Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Published", value: jobStats.published, color: "text-green-400" },
          { label: "Drafts", value: jobStats.draft, color: "text-amber-400" },
          { label: "Closed", value: jobStats.closed, color: "text-rose-400" },
          { label: "Total Posted", value: jobStats.total, color: "text-[var(--accent)]" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Personal Information */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Personal Information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Full Name</label>
            {editMode ? (
              <input type="text" value={profileData.personal.name} onChange={(e) => setProfileData((p) => ({ ...p, personal: { ...p.personal, name: e.target.value } }))} className="w-full input-glass px-3 py-2 text-sm" />
            ) : (
              <p className="text-sm text-[var(--text-primary)]">{profileData.personal.name || "—"}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Job Title</label>
            {editMode ? (
              <input type="text" value={profileData.personal.title} onChange={(e) => setProfileData((p) => ({ ...p, personal: { ...p.personal, title: e.target.value } }))} placeholder="e.g. HR Manager" className="w-full input-glass px-3 py-2 text-sm" />
            ) : (
              <p className="text-sm text-[var(--text-primary)]">{profileData.personal.title || "—"}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Email</label>
            <p className="text-sm text-[var(--text-primary)]">{profileData.personal.email || "—"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Phone</label>
            {editMode ? (
              <input type="tel" value={profileData.personal.phone} onChange={(e) => setProfileData((p) => ({ ...p, personal: { ...p.personal, phone: e.target.value } }))} placeholder="+63 XXX XXX XXXX" className="w-full input-glass px-3 py-2 text-sm" />
            ) : (
              <p className="text-sm text-[var(--text-primary)]">{profileData.personal.phone || "—"}</p>
            )}
          </div>
        </div>
      </motion.section>

      {/* Organization */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Organization
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Organization Name</label>
            {editMode ? (
              <input type="text" value={profileData.organization.name} onChange={(e) => setProfileData((p) => ({ ...p, organization: { ...p.organization, name: e.target.value } }))} placeholder="e.g. Acme Corporation" className="w-full input-glass px-3 py-2 text-sm" />
            ) : (
              <p className="text-sm text-[var(--text-primary)]">{profileData.organization.name || "—"}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Organization Type</label>
            {editMode ? (
              <select value={profileData.organization.type} onChange={(e) => setProfileData((p) => ({ ...p, organization: { ...p.organization, type: e.target.value } }))} className="w-full input-glass px-3 py-2 text-sm">
                <option value="">Select type...</option>
                <option value="Corporation">Corporation</option>
                <option value="Startup">Startup</option>
                <option value="Non-Profit">Non-Profit</option>
                <option value="Government">Government</option>
                <option value="Educational">Educational Institution</option>
                <option value="Recruitment Agency">Recruitment Agency</option>
              </select>
            ) : (
              <p className="text-sm text-[var(--text-primary)]">{profileData.organization.type || "—"}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Company Size</label>
            {editMode ? (
              <select value={profileData.organization.size} onChange={(e) => setProfileData((p) => ({ ...p, organization: { ...p.organization, size: e.target.value } }))} className="w-full input-glass px-3 py-2 text-sm">
                <option value="">Select size...</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
            ) : (
              <p className="text-sm text-[var(--text-primary)]">{profileData.organization.size || "—"}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Website</label>
            {editMode ? (
              <input type="url" value={profileData.organization.website} onChange={(e) => setProfileData((p) => ({ ...p, organization: { ...p.organization, website: e.target.value } }))} placeholder="https://..." className="w-full input-glass px-3 py-2 text-sm" />
            ) : (
              <p className="text-sm text-[var(--text-primary)]">
                {profileData.organization.website ? (
                  <a href={profileData.organization.website} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">{profileData.organization.website}</a>
                ) : "—"}
              </p>
            )}
          </div>
        </div>
      </motion.section>

      {/* Employer Portfolio */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Employer Portfolio
          </h2>
          {editMode && (
            <button type="button" onClick={addEmployer} className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Employer
            </button>
          )}
        </div>

        {profileData.employers.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 text-center">
            <svg className="mx-auto h-10 w-10 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="mt-3 text-sm text-[var(--text-muted)]">No employers added yet.</p>
            {editMode && <p className="mt-1 text-xs text-[var(--text-muted)]">Click &quot;Add Employer&quot; to get started.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {profileData.employers.map((employer) => (
              <div key={employer.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                {editMode ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--text-muted)]">Employer Details</span>
                      <button type="button" onClick={() => removeEmployer(employer.id)} className="text-xs text-[var(--error-text)] hover:underline">Remove</button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input type="text" value={employer.employerName} onChange={(e) => updateEmployer(employer.id, "employerName", e.target.value)} placeholder="Employer name" className="input-glass px-3 py-2 text-sm" />
                      <input type="text" value={employer.industry} onChange={(e) => updateEmployer(employer.id, "industry", e.target.value)} placeholder="Industry" className="input-glass px-3 py-2 text-sm" />
                      <input type="text" value={employer.contactPerson} onChange={(e) => updateEmployer(employer.id, "contactPerson", e.target.value)} placeholder="Contact person" className="input-glass px-3 py-2 text-sm" />
                      <select value={employer.status} onChange={(e) => updateEmployer(employer.id, "status", e.target.value)} className="input-glass px-3 py-2 text-sm">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{employer.employerName || "Unnamed Employer"}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {employer.industry || "No industry"} • Contact: {employer.contactPerson || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-[var(--text-muted)]">{employer.activeJobs} active / {employer.totalJobsPosted} total</p>
                      </div>
                      <span className={`badge-pill text-[10px] ${
                        employer.status === "Active" ? "bg-green-500/15 text-green-400 border border-green-500/20" :
                        employer.status === "Inactive" ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" :
                        "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      }`}>
                        {employer.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Cancel button in edit mode */}
      {editMode && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setEditMode(false)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Cancel
          </button>
        </div>
      )}
    </main>
  );
}
