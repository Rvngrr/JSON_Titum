"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/shared/Toast";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface ResumeUploadProps {
  /** Callback invoked with extracted skills after successful resume parsing */
  onSkillsExtracted?: (
    skills: Array<{
      name: string;
      proficiency_level: "beginner" | "intermediate" | "advanced" | "expert";
    }>
  ) => void;
  /** Callback invoked when parsing fails and user should enter skills manually */
  onParseFailure?: () => void;
  /** Currently saved resume filename to display */
  existingFilename?: string | null;
}

type UploadStatus = "idle" | "validating" | "uploading" | "parsing" | "success" | "error";

export default function ResumeUpload({
  onSkillsExtracted,
  onParseFailure,
  existingFilename = null,
}: ResumeUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFilename, setCurrentFilename] = useState<string | null>(existingFilename);
  const [isDragOver, setIsDragOver] = useState(false);
  const { addToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
        return "Invalid file type. Please upload a PDF or DOCX file.";
      }
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "File size exceeds 5MB. Please upload a smaller file.";
    }

    return null;
  };

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setStatus("validating");
      setUploadProgress(0);

      // Client-side validation
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setStatus("error");
        return;
      }

      try {
        setStatus("uploading");
        const supabase = createClient();

        // Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setError("You must be logged in to upload a resume.");
          setStatus("error");
          return;
        }

        // Build storage path: resumes/{user_id}/{filename}
        const filePath = `${user.id}/${file.name}`;

        // Simulate progress for upload
        setUploadProgress(20);

        // Upload via server-side API route (bypasses storage RLS)
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        const uploadResponse = await fetch("/api/resume/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const uploadData = await uploadResponse.json().catch(() => null);
          setError(uploadData?.error || "Upload failed. Please try again.");
          setStatus("error");
          return;
        }

        const uploadResult = await uploadResponse.json();

        setUploadProgress(60);
        setCurrentFilename(file.name);
        setStatus("parsing");

        // Call the parse API route to extract skills
        const parseResponse = await fetch("/api/resume/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_path: uploadResult.file_path, user_id: uploadResult.user_id }),
        });

        setUploadProgress(90);

        if (!parseResponse.ok) {
          const errorData = await parseResponse.json().catch(() => null);
          const message =
            errorData?.error || "Failed to parse resume. Please try entering your skills manually.";
          setError(message);
          setStatus("error");
          if (message.includes("API key") || message.includes("AI")) {
            addToast("warning", "AI service unavailable. Please enter your skills manually.");
          } else {
            addToast("error", message);
          }
          onParseFailure?.();
          return;
        }

        const parseData = await parseResponse.json();

        if (!parseData.success) {
          const message = parseData.error ||
            "Failed to extract skills from resume. Please enter your skills manually.";
          setError(message);
          setStatus("error");
          if (message.includes("API key") || message.includes("AI")) {
            addToast("warning", "AI service unavailable. Please enter your skills manually.");
          } else {
            addToast("error", message);
          }
          onParseFailure?.();
          return;
        }

        setUploadProgress(100);
        setStatus("success");
        addToast("success", "Resume parsed successfully!");

        // Notify user about sections that had no data extracted
        if (parseData.warnings && parseData.warnings.length > 0) {
          for (const warning of parseData.warnings) {
            addToast("warning", warning);
          }
        }

        onSkillsExtracted?.(parseData.skills);
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        setStatus("error");
        addToast("error", message);
      }
    },
    [onSkillsExtracted, onParseFailure, addToast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleUpload(files[0]);
      }
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleUpload(files[0]);
      }
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleUpload]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isProcessing = status === "validating" || status === "uploading" || status === "parsing";

  return (
    <section aria-label="Resume upload" className="w-full">
      {/* Current resume display */}
      {currentFilename && status !== "uploading" && status !== "parsing" && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <svg
                className="h-5 w-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                Current resume: <strong>{currentFilename}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const response = await fetch(`/api/resume/view?applicant_id=${user.id}`);
                    const data = await response.json();
                    if (data.url) {
                      window.open(data.url, "_blank");
                    } else {
                      addToast("error", data.error || "Unable to open resume.");
                    }
                  } catch {
                    addToast("error", "Failed to open resume.");
                  }
                }}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="View current resume"
              >
                View Resume
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Replace current resume with a new file"
              >
                Replace Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop zone for resume upload. Drag and drop a PDF or DOCX file here, or click to browse."
        aria-describedby="upload-instructions"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowseClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragOver
            ? "border-blue-500 bg-blue-50"
            : status === "error"
              ? "border-red-300 bg-red-50"
              : status === "success"
                ? "border-green-300 bg-green-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
      >
        {/* Upload icon */}
        <svg
          className="mb-3 h-10 w-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        <p id="upload-instructions" className="mb-1 text-sm text-gray-600">
          <span className="font-semibold text-blue-600">Click to browse</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">PDF or DOCX (max 5MB)</p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Progress indicator */}
      {isProcessing && (
        <div className="mt-3" role="status" aria-live="polite" aria-label="Upload progress">
          <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
            <span>
              {status === "validating" && "Validating file..."}
              {status === "uploading" && "Uploading resume..."}
              {status === "parsing" && "Extracting skills from resume..."}
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success message */}
      {status === "success" && (
        <div
          className="mt-3 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700"
          role="status"
          aria-live="polite"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Resume uploaded and skills extracted successfully!</span>
        </div>
      )}

      {/* Error message */}
      {status === "error" && error && (
        <div
          className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p>{error}</p>
              {error.includes("manually") && (
                <p className="mt-1 text-xs text-red-600">
                  You can add your skills manually using the skill profile editor below.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
