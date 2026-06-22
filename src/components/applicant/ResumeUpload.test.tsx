import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ResumeUpload from "./ResumeUpload";

// Mock the Supabase client
const mockUpload = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  }),
}));

// Mock fetch for the parse API
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockFile(name: string, size: number, type: string): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

describe("ResumeUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockUpload.mockResolvedValue({ error: null });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ file_path: "user-123/resume.pdf", user_id: "user-123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          skills: [{ name: "React", proficiency_level: "advanced" }],
        }),
      });
  });

  it("renders the drop zone with instructions", () => {
    render(<ResumeUpload />);

    expect(screen.getByText("Click to browse")).toBeInTheDocument();
    expect(screen.getByText(/drag and drop/)).toBeInTheDocument();
    expect(screen.getByText("PDF or DOCX (max 5MB)")).toBeInTheDocument();
  });

  it("renders with accessible attributes", () => {
    render(<ResumeUpload />);

    const dropZone = screen.getByRole("button", {
      name: /drop zone for resume upload/i,
    });
    expect(dropZone).toHaveAttribute("tabindex", "0");
    expect(dropZone).toHaveAttribute("aria-describedby", "upload-instructions");
  });

  it("displays existing filename when provided", () => {
    render(<ResumeUpload existingFilename="my-resume.pdf" />);

    expect(screen.getByText("my-resume.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Current resume:/)).toBeInTheDocument();
  });

  it("rejects files with invalid MIME type", async () => {
    render(<ResumeUpload />);

    const file = createMockFile("resume.txt", 1024, "text/plain");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText("Invalid file type. Please upload a PDF or DOCX file.")
      ).toBeInTheDocument();
    });
  });

  it("rejects files exceeding 5MB", async () => {
    render(<ResumeUpload />);

    const file = createMockFile(
      "big-resume.pdf",
      6 * 1024 * 1024,
      "application/pdf"
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText("File size exceeds 5MB. Please upload a smaller file.")
      ).toBeInTheDocument();
    });
  });

  it("uploads valid PDF and calls onSkillsExtracted on success", async () => {
    const onSkillsExtracted = vi.fn();
    // Mock the upload endpoint
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ file_path: "user-123/resume.pdf", user_id: "user-123" }),
      })
      // Mock the parse endpoint
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          skills: [{ name: "React", proficiency_level: "advanced" }],
        }),
      });

    render(<ResumeUpload onSkillsExtracted={onSkillsExtracted} />);

    const file = createMockFile("resume.pdf", 1024, "application/pdf");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onSkillsExtracted).toHaveBeenCalledWith([
        { name: "React", proficiency_level: "advanced" },
      ]);
    });

    // Verify upload API was called
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/resume/upload",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("calls onParseFailure when resume parsing fails", async () => {
    // Reset the default fetch mocks and set up custom ones
    mockFetch.mockReset();
    // Upload succeeds, parse returns failure
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ file_path: "user-123/resume.pdf", user_id: "user-123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "Failed to extract skills from resume. Please enter your skills manually.",
        }),
      });

    const onParseFailure = vi.fn();
    render(<ResumeUpload onParseFailure={onParseFailure} />);

    const file = createMockFile("resume.pdf", 1024, "application/pdf");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onParseFailure).toHaveBeenCalled();
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    render(<ResumeUpload />);

    const file = createMockFile("resume.pdf", 1024, "application/pdf");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText("You must be logged in to upload a resume.")
      ).toBeInTheDocument();
    });
  });

  it("shows error when Supabase upload fails", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Storage quota exceeded" }),
    });

    render(<ResumeUpload />);

    const file = createMockFile("resume.pdf", 1024, "application/pdf");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText("Storage quota exceeded")
      ).toBeInTheDocument();
    });
  });

  it("accepts DOCX files", async () => {
    const onSkillsExtracted = vi.fn();
    render(<ResumeUpload onSkillsExtracted={onSkillsExtracted} />);

    const file = createMockFile(
      "resume.docx",
      2048,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onSkillsExtracted).toHaveBeenCalled();
    });
  });

  it("handles drag and drop", async () => {
    const onSkillsExtracted = vi.fn();
    render(<ResumeUpload onSkillsExtracted={onSkillsExtracted} />);

    const dropZone = screen.getByRole("button", {
      name: /drop zone for resume upload/i,
    });

    const file = createMockFile("resume.pdf", 1024, "application/pdf");

    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(onSkillsExtracted).toHaveBeenCalled();
    });
  });
});
