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
  title: string;
  status: string;
  mode: string;
  summaryLine?: string;
  createdAt: string;
  documentKind?: string;
  imageSrc?: string;
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reports state
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

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

    if (file.size > 12 * 1024 * 1024) {
      setUploadError("File exceeds 12 MB limit. Please select a smaller file.");
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

  // Submit to existing AI agents
  const handleSubmitForAnalysis = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", `${docCategory} — ${selectedFile.name}`);
      if (user) {
        formData.append("userId", user.id);
        formData.append("patientName", user.name);
        if (user.age) formData.append("patientAge", String(user.age));
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed. Please try again.");
      }

      // Successfully submitted to pipeline!
      // Navigate to live analyzer with runId so agents start streaming!
      router.push(`/analyze?runId=${data.runId}`);
    } catch (err: any) {
      setUploadError(err.message || "Failed to submit document for AI analysis.");
      setUploading(false);
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
              <p className="mt-1 text-[14px] text-dim">
                Manage your prescriptions, view daily pill routines, and run AI multi-agent analysis.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-ghost h-10 px-4 text-[13px] flex items-center gap-2 border border-line hover:border-rose/40 hover:text-rose transition-colors"
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>

          {/* 1. PATIENT CREDENTIALS & ID CARD */}
          <div className="glass relative overflow-hidden rounded-[24px] p-6 md:p-8 border border-mint/25 shadow-xl mb-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-mint/20 to-cy/20 text-mint border border-mint/30 shadow-inner">
                  <User size={30} />
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
                    Supports JPG, PNG photos or scanned PDFs (Max 12 MB)
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

                  {/* Submission Action */}
                  <button
                    type="button"
                    onClick={handleSubmitForAnalysis}
                    disabled={uploading}
                    className="btn btn-primary w-full h-12 text-[14px] flex items-center justify-center gap-2 font-bold shadow-lg disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Sparkles size={18} className="animate-spin" /> Deploying AI Agents...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} /> Submit for AI Multi-Agent Analysis <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* How the AI Agents Process Your Document */}
            <div className="glass rounded-[24px] p-6 md:p-8 border border-line/70 shadow-xl flex flex-col justify-between">
              <div>
                <span className="eyebrow">Autonomous Clinical Pipeline</span>
                <h3 className="h-display mt-2 text-[20px] font-bold text-fg">
                  What happens when you submit?
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
                  Your uploaded file is processed by our 5 specialized medical agents in an autonomous relay race:
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    { step: "01", agent: "LUMEN", desc: "Deciphers doctor handwriting, Latin sig codes, and structures medicines & dosages." },
                    { step: "02", agent: "MEDSCOPE", desc: "Cross-checks NIH RxNav & openFDA databases for active ingredients & FDA warnings." },
                    { step: "03", agent: "PLAINWORDS", desc: "Translates clinical jargon into compassionate, simple English anyone can understand." },
                    { step: "04", agent: "GUARDIAN", desc: "Screens all medicine pairs for dangerous interactions and duplicate therapies." },
                    { step: "05", agent: "SATHI", desc: "Builds a daily visual timetable (Morning/Noon/Night) & tailored doctor questions." },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3 rounded-xl border border-line/60 bg-panel2/50 p-3">
                      <span className="font-mono2 text-[11px] font-bold text-mint bg-mint/10 rounded-md px-1.5 py-0.5">
                        {s.step}
                      </span>
                      <div>
                        <p className="m-0 font-display text-[13px] font-bold text-fg">
                          {s.agent}
                        </p>
                        <p className="m-0 text-[12px] text-dim">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between">
                <span className="font-mono2 text-[10px] text-faint uppercase tracking-wider">
                  Live voice readout &amp; PDF export included
                </span>
                <Link href="/analyze" className="text-[12px] font-semibold text-mint hover:underline flex items-center gap-1">
                  Open live sandbox <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

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

                      <div className="mt-5 pt-3 border-t border-line/60 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-mono2 text-[10px] text-faint">
                          <Volume2 size={12} className="text-mint" /> Audio Guide
                        </span>
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
      </main>
      <Footer />
    </>
  );
}
