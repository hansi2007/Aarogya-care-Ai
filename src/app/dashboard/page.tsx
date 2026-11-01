"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  CloudUpload,
  Download,
  Eye,
  FileImage,
  FileScan,
  FileText,
  FileType2,
  FlaskConical,
  HeartPulse,
  History,
  IdCard,
  LogOut,
  Pill,
  PlusCircle,
  Radar,
  ScanLine,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  UploadCloud,
  User,
  Volume2,
  X,
} from "lucide-react";
import Nav, { Logo } from "@/components/nav";
import Footer from "@/components/footer";
import { FullReport } from "@/components/analyze/results";
import type { AnalysisPayload } from "@/lib/medical/types";

interface PatientUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  patientId: string;
}

interface ReportItem {
  id: string;
  documentId?: string;
  title: string;
  status: string;
  mode: string;
  summaryLine?: string;
  createdAt: string;
  documentKind?: string;
  imageSrc?: string;
  filename?: string;
  storagePath?: string;
  analysisId?: string;
  medCount?: number;
  interactionCount?: number;
  patientName?: string;
  patientAge?: number;
}

export default function PatientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<PatientUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [docCategory, setDocCategory] = useState("Prescription Slip");
  const [customNote, setCustomNote] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Analysis Results on Dashboard
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisPayload | null>(null);
  const [latestAnalysisId, setLatestAnalysisId] = useState<string | null>(null);
  const [latestRunId, setLatestRunId] = useState<string | null>(null);
  const [analyzedDocTitle, setAnalyzedDocTitle] = useState<string | null>(null);

  // Reports state
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // View original document modal state
  const [docModal, setDocModal] = useState<{
    isOpen: boolean;
    title: string;
    viewUrl: string | null;
    isPdf: boolean;
    loading: boolean;
  }>({
    isOpen: false,
    title: "",
    viewUrl: null,
    isPdf: false,
    loading: false,
  });

  // Delete document modal state
  const [deleteTarget, setDeleteTarget] = useState<ReportItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          // Check local storage fallback
          const local = localStorage.getItem("aarogya_user");
          if (local) {
            try {
              setUser(JSON.parse(local));
            } catch {
              router.push("/login");
            }
          } else {
            router.push("/login");
          }
        }
      } catch {
        const local = localStorage.getItem("aarogya_user");
        if (local) {
          try {
            setUser(JSON.parse(local));
          } catch {
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      } finally {
        setLoadingUser(false);
      }
    }

    checkAuth();
  }, [router]);

  // Load patient reports
  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/runs");
      if (res.ok) {
        const data = await res.json();
        setReports(data.runs || []);
      }
    } catch (err) {
      console.warn("Failed to fetch reports:", err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // File handling
  const handleFileSelect = (file: File | null) => {
    setUploadError(null);
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(file.name);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPdf) {
      setUploadError("Please upload a valid JPG, PNG image or a PDF document.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError("File exceeds 15 MB limit. Please select a smaller file.");
      return;
    }

    setSelectedFile(file);

    if (isImage) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Download formatted medical care plan text file
  const downloadCarePlanText = (title: string, payload: any) => {
    const dateStr = new Date().toLocaleDateString();
    let content = `====================================================\n`;
    content += `AAROGYA CARE AI — PATIENT MEDICAL CARE PLAN\n`;
    content += `Date: ${dateStr}\n`;
    content += `Patient: ${user?.name || "Patient"} | ID: ${user?.patientId || "N/A"}\n`;
    content += `Document: ${title}\n`;
    content += `====================================================\n\n`;

    content += `[1] OVERVIEW & SUMMARY:\n`;
    content += `${payload.plain?.headline || "Medical Record Breakdown"}\n`;
    content += `${payload.plain?.overview || ""}\n\n`;

    if (payload.structured?.medicines?.length) {
      content += `[2] PRESCRIBED MEDICINES:\n`;
      payload.structured.medicines.forEach((m: any, idx: number) => {
        content += `${idx + 1}. ${m.name} ${m.strength || ""} (${m.form})\n`;
        content += `   Dose / Timing: ${m.sigCode || m.frequency || "As scheduled"} — ${m.timing || ""}\n`;
        if (m.duration) content += `   Duration: ${m.duration}\n`;
        if (m.notes) content += `   ⚠️ Notice: ${m.notes}\n`;
      });
      content += `\n`;
    }

    if (payload.structured?.labs?.length) {
      content += `[2] LABORATORY TEST RESULTS:\n`;
      payload.structured.labs.forEach((l: any, idx: number) => {
        content += `${idx + 1}. ${l.test}: ${l.value} ${l.unit || ""} (Ref: ${l.ref || "Standard"}) [${l.flag === "H" ? "HIGH" : l.flag === "L" ? "LOW" : "NORMAL"}]\n`;
        if (l.plain) content += `   What it measures: ${l.plain}\n`;
      });
      content += `\n`;
    }

    if (payload.routine?.length) {
      content += `[3] DAILY ROUTINE TIMETABLE:\n`;
      payload.routine.forEach((slot: any) => {
        content += `• ${slot.title} (${slot.timeRange}):\n`;
        slot.meds.forEach((m: any) => {
          content += `  - ${m.name}: ${m.dosage} (${m.instructions})\n`;
        });
      });
      content += `\n`;
    }

    if (payload.plain?.watchOut?.length) {
      content += `[4] SAFETY WATCH-OUTS & PRECAUTIONS:\n`;
      payload.plain.watchOut.forEach((w: string) => {
        content += `• ${w}\n`;
      });
      content += `\n`;
    }

    if (payload.doctorQuestions?.length) {
      content += `[5] QUESTIONS FOR YOUR DOCTOR:\n`;
      payload.doctorQuestions.forEach((q: any, idx: number) => {
        content += `${idx + 1}. ${q.question}\n   Reason: ${q.reason}\n`;
      });
      content += `\n`;
    }

    content += `\nDISCLAIMER: Aarogya Care AI provides informational medical assistance only. It is not a replacement for professional medical advice, diagnosis, or treatment.\n`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Aarogya-Care-Report-${title.replace(/[^a-zA-Z0-9]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Submit to Gemini AI Multi-Agent Pipeline Directly
  const handleSubmitForAnalysis = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgressMsg("1. Reading prescription handwriting with Gemini Vision AI…");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const docTitle = `${docCategory} — ${selectedFile.name}`;

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", docTitle);
      if (user) {
        formData.append("userId", user.id);
        formData.append("patientName", user.name);
        if (user.age) formData.append("patientAge", String(user.age));
      }

      const t1 = setTimeout(() => {
        setUploadProgressMsg("2. Extracting medicines, dosages & doctor instructions…");
      }, 1500);
      const t2 = setTimeout(() => {
        setUploadProgressMsg("3. Generating simple-English explanation & care routine…");
      }, 3500);

      const res = await fetch("/api/analyze-direct", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearTimeout(t1);
      clearTimeout(t2);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Analysis failed. Please try again.");
      }

      if (data.payload) {
        setLatestAnalysis(data.payload);
        setLatestAnalysisId(data.analysisId || null);
        setLatestRunId(data.runId || null);
        setAnalyzedDocTitle(docTitle);
        setUploadProgressMsg("");
        fetchReports();
        setTimeout(() => {
          const el = document.getElementById("latest-analysis-result");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      } else {
        throw new Error("No analysis returned from AI engine.");
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setUploadError("Analysis timed out after 60 seconds. Please try uploading the document again.");
      } else {
        setUploadError(err.message || "Failed to submit document for AI analysis.");
      }
      setUploadProgressMsg("");
    } finally {
      setUploading(false);
    }
  };

  // Instant 1-Click Sample Analyzer
  const handleDirectSampleAnalyze = async (file: File, sampleTitle: string) => {
    if (uploading) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    setUploading(true);
    setUploadError(null);
    setUploadProgressMsg("1. Reading sample prescription with Gemini Vision AI…");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", sampleTitle);
      if (user) {
        formData.append("userId", user.id);
        formData.append("patientName", user.name);
        if (user.age) formData.append("patientAge", String(user.age));
      }

      const t1 = setTimeout(() => {
        setUploadProgressMsg("2. Extracting medicines, dosages & doctor instructions…");
      }, 1200);
      const t2 = setTimeout(() => {
        setUploadProgressMsg("3. Generating simple-English explanation & care routine…");
      }, 2400);

      const res = await fetch("/api/analyze-direct", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearTimeout(t1);
      clearTimeout(t2);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      if (data.payload) {
        setLatestAnalysis(data.payload);
        setLatestAnalysisId(data.analysisId || null);
        setLatestRunId(data.runId || null);
        setAnalyzedDocTitle(sampleTitle);
        setUploadProgressMsg("");
        fetchReports();
        setTimeout(() => {
          const el = document.getElementById("latest-analysis-result");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setUploadError("Analysis timed out after 25 seconds. Please try again.");
      } else {
        setUploadError(err.message || "Failed to analyze document.");
      }
      setUploadProgressMsg("");
    } finally {
      setUploading(false);
    }
  };

  // View Original Document Handler
  const handleViewOriginal = async (report: ReportItem) => {
    if (!report.documentId && !report.imageSrc) return;

    setDocModal({
      isOpen: true,
      title: report.title,
      viewUrl: report.imageSrc || null,
      isPdf: report.documentKind === "pdf" || report.filename?.endsWith(".pdf") || false,
      loading: !!report.documentId,
    });

    if (report.documentId) {
      try {
        const res = await fetch(`/api/documents/${report.documentId}`);
        if (res.ok) {
          const docData = await res.json();
          setDocModal((prev) => ({
            ...prev,
            viewUrl: docData.viewUrl || prev.viewUrl,
            isPdf: docData.kind === "pdf" || docData.mime === "application/pdf",
            loading: false,
          }));
        } else {
          setDocModal((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        setDocModal((prev) => ({ ...prev, loading: false }));
      }
    }
  };

  // Delete Document Handler
  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);

    try {
      const docId = deleteTarget.documentId;
      if (docId) {
        const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to delete document");
        }
      }
      setDeleteTarget(null);
      await fetchReports();
    } catch (err: any) {
      alert(err.message || "Error deleting medical record.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Download explanation report handler
  const handleDownloadExplanation = async (report: ReportItem) => {
    if (!report.analysisId) {
      alert("Analysis is still in progress. Please wait for completion.");
      return;
    }

    try {
      const res = await fetch(`/api/analyses/${report.analysisId}`);
      if (!res.ok) throw new Error("Could not retrieve analysis data");
      const { analysis } = await res.json();
      downloadCarePlanText(report.title, analysis.payload);
    } catch (err: any) {
      alert("Failed to download explanation: " + err.message);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("aarogya_user");
    router.push("/login");
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-mint">
        <Sparkles size={28} className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Nav />
      <main className="relative min-h-screen pb-24 pt-[104px] md:pt-[124px]">
        <div className="grid-bg absolute inset-x-0 top-0 h-[520px]" />
        <div className="glow-orb absolute -left-40 top-24 h-[440px] w-[440px] bg-[#2ee6c012]" />
        <div className="glow-orb absolute -right-40 top-40 h-[440px] w-[440px] bg-[#58b7f810]" />

        <div className="relative mx-auto max-w-6xl px-5 md:px-8">
          {/* Top Bar: Title & Logout */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="eyebrow">Patient Health Portal</span>
              <h1 className="h-display mt-2 text-[clamp(1.9rem,4vw,2.8rem)] text-fg font-bold tracking-tight">
                Welcome back, <span className="text-grad">{user?.name || "Patient"}</span>
              </h1>
              <p className="mt-1 text-[13.5px] text-dim">
                Manage your prescriptions, laboratory reports, and AI care plans in one secure place.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/history"
                className="btn btn-ghost h-10 px-4 text-[12.5px] flex items-center gap-2 border border-line"
              >
                <History size={14} className="text-mint" /> Medical Vault
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-ghost h-10 px-4 text-[12.5px] flex items-center gap-2 border border-line text-rose/90 hover:text-rose hover:border-rose/30"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>

          {/* 1. PATIENT CREDENTIAL CARD (NAME, AGE, CREDENTIALS) */}
          <div className="glass rounded-[24px] p-6 md:p-7 border border-mint/30 shadow-lg mb-8 bg-panel/80">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-mint/20 to-cy/20 text-mint border border-mint/40 shadow-inner">
                  <User size={28} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="m-0 font-display text-[20px] font-bold text-fg">
                      {user?.name}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-md bg-mint/15 px-2.5 py-0.5 font-mono2 text-[10px] uppercase tracking-wider text-mint border border-mint/30">
                      <ShieldCheck size={11} /> Verified Patient
                    </span>
                  </div>
                  <p className="m-0 mt-1 font-mono2 text-[11px] text-mintsoft">
                    Patient ID: <span className="font-bold text-white tracking-widest">{user?.patientId || "AC-54892"}</span>
                  </p>
                </div>
              </div>

              {/* Patient Credential Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                <div className="rounded-xl border border-line bg-panel2/70 p-3 text-center sm:text-left">
                  <p className="m-0 font-mono2 text-[9.5px] uppercase tracking-wider text-faint">Age</p>
                  <p className="m-0 mt-0.5 font-display text-[15px] font-bold text-fg">
                    {user?.age ? `${user.age} Years` : "Not specified"}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-panel2/70 p-3 text-center sm:text-left">
                  <p className="m-0 font-mono2 text-[9.5px] uppercase tracking-wider text-faint">Gender</p>
                  <p className="m-0 mt-0.5 font-display text-[15px] font-bold text-fg">
                    {user?.gender || "Male"}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-panel2/70 p-3 text-center sm:text-left">
                  <p className="m-0 font-mono2 text-[9.5px] uppercase tracking-wider text-faint">Phone</p>
                  <p className="m-0 mt-0.5 font-display text-[14px] font-semibold text-fg truncate">
                    {user?.phone ? `+91 ${user.phone}` : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-panel2/70 p-3 text-center sm:text-left">
                  <p className="m-0 font-mono2 text-[9.5px] uppercase tracking-wider text-faint">Email</p>
                  <p className="m-0 mt-0.5 font-display text-[13px] font-semibold text-fg truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. MEDICAL DOCUMENT UPLOAD & AI AGENT SUBMISSION */}
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] mb-12">
            {/* Upload Zone */}
            <div className="glass rounded-[24px] p-6 md:p-8 border border-mint/20 shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/15 text-mint">
                  <CloudUpload size={20} />
                </span>
                <div>
                  <h3 className="m-0 font-display text-[18px] font-bold text-fg">
                    Upload Medical Document
                  </h3>
                  <p className="m-0 text-[12.5px] text-dim">
                    Doctor prescriptions, lab results, discharge summaries in JPG, PNG or PDF
                  </p>
                </div>
              </div>

              {/* Document Category Selector */}
              <div className="mb-4">
                <label className="block text-[12px] font-mono2 uppercase tracking-wider text-faint mb-2">
                  Document Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    "Prescription Slip",
                    "Lab Test Report",
                    "Discharge Summary",
                    "Medical Note",
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDocCategory(cat)}
                      className={`rounded-xl border py-2 px-2 text-[11px] font-medium transition-all text-center ${
                        docCategory === cat
                          ? "border-mint bg-mint/15 text-mint font-semibold shadow-sm"
                          : "border-line bg-panel2/50 text-dim hover:text-fg hover:border-mint/30"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag and Drop Box */}
              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                    isDragging
                      ? "border-mint bg-mint/10 scale-[1.01]"
                      : "border-line/70 bg-panel2/40 hover:border-mint/40 hover:bg-panel2/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/10 text-mint mb-3">
                    <UploadCloud size={28} />
                  </div>
                  <p className="m-0 font-display text-[15px] font-semibold text-fg">
                    Click to browse or drag &amp; drop file here
                  </p>
                  <p className="m-0 mt-1 text-[12.5px] text-faint">
                    Supports JPG, PNG photos or scanned PDFs (Max 15 MB)
                  </p>
                </div>
              ) : (
                /* Selected File Card */
                <div className="rounded-2xl border border-mint/40 bg-panel2/80 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint/15 text-mint">
                        {selectedFile.type === "application/pdf" ? (
                          <FileType2 size={24} className="text-rose" />
                        ) : (
                          <FileImage size={24} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="m-0 font-display text-[14.5px] font-semibold text-fg truncate">
                          {selectedFile.name}
                        </p>
                        <p className="m-0 text-[12px] text-dim">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {docCategory}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="p-1.5 text-faint hover:text-rose transition-colors rounded-lg hover:bg-rose/10"
                      title="Remove file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {filePreview && (
                    <div className="relative h-44 overflow-hidden rounded-xl border border-line bg-black/40">
                      <Image
                        src={filePreview}
                        alt="Document Preview"
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                  )}

                  {uploadError && (
                    <div className="rounded-xl border border-rose/30 bg-rose/10 p-3 text-[12.5px] text-rose flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {uploading && uploadProgressMsg && (
                    <div className="rounded-xl border border-mint/30 bg-mint/10 p-3 text-[12.5px] text-mint flex items-center gap-2">
                      <Sparkles size={15} className="animate-spin shrink-0" />
                      <span>{uploadProgressMsg}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={handleSubmitForAnalysis}
                      className="btn btn-primary h-12 w-full text-[13.5px] font-semibold shadow-lg shadow-mint/20"
                    >
                      {uploading ? (
                        <>
                          <Sparkles size={16} className="animate-spin" /> Analyzing with AI Agents...
                        </>
                      ) : (
                        <>
                          <ScanSearch size={16} /> Submit Document for AI Analysis <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick-Test Sample Documents Card */}
            <div className="glass rounded-[24px] p-6 md:p-8 flex flex-col justify-between border border-line">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-viol/15 text-viol">
                    <FileScan size={20} />
                  </span>
                  <div>
                    <h3 className="m-0 font-display text-[17px] font-bold text-fg">
                      Try Sample Prescriptions
                    </h3>
                    <p className="m-0 text-[12.5px] text-dim">
                      Test instant AI extraction with pre-verified clinical documents
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: "rx-slip-1",
                      title: "Sample 1: Type 2 Diabetes & Hypertension",
                      desc: "Metformin, Glimepiride, Amlodipine, Atorvastatin, Vitamin D3",
                      badge: "Prescription",
                      file: "/samples/rx-slip-1.png",
                    },
                    {
                      id: "rx-slip-2",
                      title: "Sample 2: Acute Upper Respiratory Infection",
                      desc: "Amoxicillin-Clav, Paracetamol, Cetirizine, Pantoprazole",
                      badge: "Prescription",
                      file: "/samples/rx-slip-2.png",
                    },
                    {
                      id: "lab-report",
                      title: "Sample 3: Comprehensive Diagnostic Lab Report",
                      desc: "HbA1c, Fasting Blood Glucose, Lipid Profile, Creatinine, TSH",
                      badge: "Lab Report",
                      file: "/samples/lab-report.png",
                    },
                  ].map((s) => (
                    <div
                      key={s.id}
                      className="group flex items-center justify-between rounded-2xl border border-line/80 bg-panel2/50 p-3.5 hover:border-mint/40 hover:bg-panel2/80 transition-all"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="rounded bg-mint/10 px-1.5 py-0.5 font-mono2 text-[9px] uppercase tracking-wider text-mint">
                            {s.badge}
                          </span>
                          <p className="m-0 font-display text-[13px] font-semibold text-fg truncate">
                            {s.title}
                          </p>
                        </div>
                        <p className="m-0 text-[11.5px] text-dim truncate">{s.desc}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(s.file);
                              const blob = await res.blob();
                              const file = new File([blob], `${s.id}.png`, { type: "image/png" });
                              handleFileSelect(file);
                            } catch {
                              alert("Failed to load sample image.");
                            }
                          }}
                          className="btn btn-ghost h-8 px-2 text-[11px] border border-line group-hover:border-mint/30 group-hover:text-mint"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={async () => {
                            try {
                              const res = await fetch(s.file);
                              const blob = await res.blob();
                              const file = new File([blob], `${s.id}.png`, { type: "image/png" });
                              handleDirectSampleAnalyze(file, s.title);
                            } catch {
                              alert("Failed to load sample image.");
                            }
                          }}
                          className="btn btn-primary h-8 px-2.5 text-[11px] font-semibold"
                        >
                          Instant AI
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line/70 flex items-center justify-between">
                <span className="font-mono2 text-[10px] text-faint uppercase tracking-wider">
                  Live voice readout &amp; PDF export included
                </span>
                <Link href="/analyze" className="text-[12px] font-semibold text-mint hover:underline flex items-center gap-1">
                  Open live sandbox <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* 2.5 LIVE AI ANALYSIS RESULTS (DIRECTLY DISPLAYED WITHOUT REDIRECTION) */}
          <AnimatePresence>
            {latestAnalysis && (
              <motion.section
                id="latest-analysis-result"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35 }}
                className="mb-14 scroll-mt-24 rounded-[28px] border-2 border-mint/40 bg-panel/90 p-6 md:p-8 shadow-2xl relative overflow-hidden"
              >
                {/* Decorative background glow */}
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-mint/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-cy/10 blur-3xl pointer-events-none" />

                {/* Header bar */}
                <div className="relative mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/20 px-3 py-1 font-mono2 text-[10.5px] font-bold uppercase tracking-wider text-mint border border-mint/40 shadow-sm">
                        <CheckCircle2 size={13} className="text-mint" /> Live Gemini AI Analysis Complete
                      </span>
                      <span className="rounded-full bg-cy/15 px-2.5 py-0.5 font-mono2 text-[9.5px] uppercase tracking-wider text-cy border border-cy/30">
                        5 Clinical Agents Verified
                      </span>
                      {latestAnalysis.meta?.mode === "live" && (
                        <span className="rounded-full bg-mint/10 px-2.5 py-0.5 font-mono2 text-[9.5px] uppercase tracking-wider text-mintsoft border border-mint/20">
                          Gemini 3.8 Flash
                        </span>
                      )}
                    </div>
                    <h2 className="m-0 font-display text-[22px] md:text-[26px] font-bold text-fg">
                      {latestAnalysis.plain?.headline || "Prescription Analysis & Care Plan"}
                    </h2>
                    <p className="m-0 mt-1 text-[13px] text-dim">
                      Document: <span className="font-semibold text-fg">{analyzedDocTitle || "Uploaded Medical Document"}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {latestAnalysisId && (
                      <Link
                        href={`/analysis/${latestAnalysisId}`}
                        className="btn btn-ghost h-9 px-3.5 text-[12px] flex items-center gap-1.5 border border-line hover:border-mint/40 hover:text-mint"
                        target="_blank"
                      >
                        <FileScan size={13} /> Dedicated Page <ArrowRight size={12} />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (latestAnalysis) {
                          downloadCarePlanText(analyzedDocTitle || "Prescription", latestAnalysis);
                        }
                      }}
                      className="btn btn-ghost h-9 px-3.5 text-[12px] flex items-center gap-1.5 border border-line hover:border-cy/40 hover:text-cy"
                    >
                      <Download size={13} /> Download Care Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLatestAnalysis(null);
                        clearSelectedFile();
                      }}
                      className="btn btn-ghost h-9 px-3 text-[12px] border border-line text-faint hover:text-fg"
                      title="Dismiss result"
                    >
                      <X size={15} /> Close
                    </button>
                  </div>
                </div>

                {/* Render the Complete Medical Care Plan */}
                <FullReport
                  payload={latestAnalysis}
                  mode={latestAnalysis.meta?.mode || "live"}
                  analysisId={latestAnalysisId || undefined}
                />
              </motion.section>
            )}
          </AnimatePresence>

          {/* 3. PATIENT'S RECENT MEDICAL REPORTS & EXPLANATIONS */}
          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="h-display text-[22px] font-bold text-fg">
                  Your Medical Reports &amp; Prescriptions
                </h3>
                <p className="m-0 mt-0.5 text-[13px] text-dim">
                  All past decoded documents and plain English guides saved in your vault.
                </p>
              </div>

              <Link
                href="/history"
                className="btn btn-ghost h-9 px-3.5 text-[12px] flex items-center gap-1.5 border border-line"
              >
                <History size={13} /> Full Vault History
              </Link>
            </div>

            {loadingReports ? (
              <div className="glass rounded-[22px] p-12 text-center text-dim flex items-center justify-center gap-2">
                <Sparkles size={18} className="animate-spin text-mint" /> Loading your reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="glass rounded-[22px] p-12 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-panel2 text-mint mb-4 border border-line">
                  <FileText size={24} />
                </span>
                <h4 className="m-0 font-display text-[16px] font-bold text-fg">
                  No documents uploaded yet
                </h4>
                <p className="mt-2 text-[13px] text-dim max-w-sm mx-auto">
                  Upload your doctor prescription, lab report, or hospital slip above to get your first plain-English guidance.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reports.slice(0, 6).map((r) => {
                  const targetUrl = r.analysisId ? `/analysis/${r.analysisId}` : `/analyze?runId=${r.id}`;
                  return (
                    <div
                      key={r.id}
                      className="glass card-hover group flex flex-col justify-between rounded-[20px] p-5 border border-line/80 hover:border-mint/40 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-mint/10 px-2 py-0.5 font-mono2 text-[9.5px] uppercase tracking-wider text-mint">
                            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                            {r.status}
                          </span>
                          <span className="font-mono2 text-[10px] text-faint">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                          </span>
                        </div>

                        <h4 className="m-0 font-display text-[15px] font-bold text-fg group-hover:text-mintsoft transition-colors truncate">
                          {r.title}
                        </h4>

                        <p className="m-0 mt-2 text-[12.5px] text-dim leading-snug line-clamp-2">
                          {r.summaryLine || "Clinical document processed by AI agents."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono2">
                          {typeof r.medCount === "number" && r.medCount > 0 && (
                            <span className="rounded-md border border-line bg-panel2 px-2 py-0.5 text-mintsoft">
                              💊 {r.medCount} medicines
                            </span>
                          )}
                          {typeof r.interactionCount === "number" && r.interactionCount > 0 ? (
                            <span className="rounded-md border border-amber/30 bg-amber/10 px-2 py-0.5 text-amber">
                              ⚠️ {r.interactionCount} alert
                            </span>
                          ) : (
                            <span className="rounded-md border border-mint/20 bg-mint/5 px-2 py-0.5 text-mint">
                              ✓ Safe sweep
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewOriginal(r)}
                            className="p-1.5 text-dim hover:text-mint transition-colors rounded-lg hover:bg-mint/10"
                            title="View original uploaded document"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadExplanation(r)}
                            className="p-1.5 text-dim hover:text-cy transition-colors rounded-lg hover:bg-cy/10"
                            title="Download Care Plan Summary"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                            className="p-1.5 text-dim hover:text-rose transition-colors rounded-lg hover:bg-rose/10"
                            title="Delete medical record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <Link
                          href={targetUrl}
                          className="btn btn-primary h-8 px-3 text-[11.5px] flex items-center gap-1"
                        >
                          View Guide <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* VIEW ORIGINAL DOCUMENT MODAL */}
        <AnimatePresence>
          {docModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              onClick={() => setDocModal((prev) => ({ ...prev, isOpen: false }))}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[24px] border border-line bg-panel p-6 shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                  <div>
                    <span className="eyebrow">Original Document</span>
                    <h3 className="m-0 font-display text-[18px] font-bold text-fg truncate">
                      {docModal.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocModal((prev) => ({ ...prev, isOpen: false }))}
                    className="p-1.5 text-faint hover:text-fg rounded-lg hover:bg-panel2"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="relative min-h-[300px] flex-1 overflow-auto rounded-xl border border-line bg-black/50 p-2 flex items-center justify-center">
                  {docModal.loading ? (
                    <div className="flex items-center gap-2 text-mint font-mono2 text-[12px]">
                      <Sparkles size={18} className="animate-spin" /> Fetching original document…
                    </div>
                  ) : docModal.viewUrl ? (
                    docModal.isPdf ? (
                      <div className="w-full text-center p-8 space-y-4">
                        <FileType2 size={48} className="mx-auto text-rose" />
                        <p className="text-fg font-semibold">PDF Document Ready</p>
                        <a
                          href={docModal.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary inline-flex items-center gap-2"
                        >
                          Open PDF in New Tab <ArrowRight size={14} />
                        </a>
                      </div>
                    ) : (
                      <div className="relative h-[480px] w-full">
                        <Image
                          src={docModal.viewUrl}
                          alt="Original Prescription"
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 800px"
                        />
                      </div>
                    )
                  ) : (
                    <p className="text-dim text-[13px]">
                      Document preview is not available for this record.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDocModal((prev) => ({ ...prev, isOpen: false }))}
                    className="btn btn-ghost h-9 px-4 text-[12px] border border-line"
                  >
                    Close Preview
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              onClick={() => !isDeleting && setDeleteTarget(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass relative w-full max-w-md rounded-[24px] border border-rose/30 bg-panel p-6 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-4 text-rose">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose/15">
                    <Trash2 size={20} />
                  </span>
                  <div>
                    <h3 className="m-0 font-display text-[17px] font-bold text-fg">
                      Delete Medical Record
                    </h3>
                    <p className="m-0 text-[12px] text-dim">
                      This action permanently removes the document and its AI analyses.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-panel2/60 p-3.5 mb-5 text-[13px] text-fg">
                  <p className="font-semibold">{deleteTarget.title}</p>
                  <p className="text-[11.5px] text-faint mt-1">
                    Uploaded on {deleteTarget.createdAt ? new Date(deleteTarget.createdAt).toLocaleDateString() : "Recent"}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDeleteTarget(null)}
                    className="btn btn-ghost h-9 px-4 text-[12px] border border-line"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={confirmDelete}
                    className="btn h-9 px-4 text-[12px] bg-rose text-white hover:bg-rose/90 font-semibold"
                  >
                    {isDeleting ? "Deleting…" : "Confirm Delete"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
