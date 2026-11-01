"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  CloudUpload,
  FileText,
  FileImage,
  FileType2,
  FlaskConical,
  Keyboard,
  LayoutGrid,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { SAMPLES } from "@/lib/medical/samples";

export type IntakePayload =
  | { kind: "sample"; sampleId: string; previewSrc: string }
  | { kind: "file"; file: File; previewSrc?: string }
  | { kind: "text"; text: string; title: string };

type Tab = "samples" | "upload" | "text";

const EXAMPLE = `Tab Metformin 500mg — 1-0-1 PC x 30 days
Tab Amlodipine 5mg — 0-0-1 x 30 days
Cap Vitamin D3 60,000 IU — once weekly x 8 weeks
Tab Ibuprofen 400mg — 1-1-1 PC SOS pain x 5 days
Dx: T2DM, HTN`;

export default function Intake({
  onDeploy,
  disabled,
}: {
  onDeploy: (p: IntakePayload) => void;
  disabled: boolean;
}) {
  const [tab, setTab] = useState<Tab>("samples");
  const [sampleId, setSampleId] = useState<string>(SAMPLES[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((f: File | null) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const ready =
    (tab === "samples" && !!sampleId) ||
    (tab === "upload" && !!file) ||
    (tab === "text" && text.trim().length >= 10);

  const deploy = () => {
    if (!ready || disabled) return;
    if (tab === "samples") {
      const s = SAMPLES.find((x) => x.id === sampleId);
      if (s) onDeploy({ kind: "sample", sampleId: s.id, previewSrc: s.imageSrc });
    } else if (tab === "upload" && file) {
      onDeploy({ kind: "file", file, previewSrc: preview ?? undefined });
    } else if (tab === "text") {
      onDeploy({ kind: "text", text: text.trim(), title: "Pasted prescription text" });
    }
  };

  const tabBtn = (t: Tab, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-panel2/40 px-3 py-2.5 font-mono2 text-[10px] uppercase tracking-[0.16em] text-faint transition-all duration-300 hover:text-fg ${
        tab === t ? "tab-active" : ""
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="glass rounded-[22px] p-5 md:p-6">
      <p className="eyebrow no-tick m-0">01 · document intake</p>
      <div className="mt-4 flex gap-2">
        {tabBtn("samples", <LayoutGrid size={13} />, "Samples")}
        {tabBtn("upload", <CloudUpload size={13} />, "Upload")}
        {tabBtn("text", <Keyboard size={13} />, "Paste")}
      </div>

      <div className="mt-5">
        {tab === "samples" && (
          <div className="space-y-3">
            {SAMPLES.map((s, i) => {
              const active = sampleId === s.id;
              return (
                <motion.button
                  key={s.id}
                  onClick={() => setSampleId(s.id)}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`group flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition-all duration-300 ${
                    active
                      ? "border-mint/50 bg-mint/[0.07] shadow-[0_0_30px_-8px_rgba(46,230,192,0.3)]"
                      : "border-line bg-panel2/40 hover:border-[rgba(130,230,255,0.25)]"
                  }`}
                >
                  <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-line">
                    <Image src={s.imageSrc} alt={s.title} fill className="object-cover" sizes="56px" />
                    {active && <span className="scan-beam" style={{ animationDuration: "3s" }} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[13.5px] font-semibold text-fg">{s.title}</span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-dim">{s.caption}</span>
                    <span className="mt-1.5 inline-flex items-center gap-1.5 font-mono2 text-[9px] uppercase tracking-[0.18em] text-mint">
                      {s.docType === "Lab report" ? <FlaskConical size={10} /> : <FileText size={10} />}
                      {s.docType}
                    </span>
                  </span>
                  <span
                    className={`ml-auto h-3 w-3 shrink-0 rounded-full border-2 transition-all ${
                      active ? "border-mint bg-mint shadow-[0_0_10px_rgba(46,230,192,0.7)]" : "border-faint/60"
                    }`}
                  />
                </motion.button>
              );
            })}
          </div>
        )}

        {tab === "upload" && (
          <div>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-panel2/30 px-4 py-10 text-center transition-all duration-300 hover:border-cy/40 hover:bg-cy/[0.04] ${
                dragging ? "dropzone-active" : ""
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,.pdf,application/pdf"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-panel2/70 text-cy">
                <UploadCloud size={24} />
              </span>
              <span className="mt-4 block font-display text-[14px] font-semibold text-fg">
                Drop your slip, PDF or lab report
              </span>
              <span className="mt-1 block text-[12px] text-dim">PNG · JPG · PDF — up to 12 MB</span>
            </label>

            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-panel2/60 p-3"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="preview" className="h-12 w-12 rounded-lg object-cover" />
                ) : file.type === "application/pdf" ? (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose/10 text-rose">
                    <FileType2 size={18} />
                  </span>
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-cy/10 text-cy">
                    <FileImage size={18} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-fg">{file.name}</span>
                  <span className="block font-mono2 text-[10px] text-faint">
                    {(file.size / 1024).toFixed(0)} KB · {file.type || "file"}
                  </span>
                </span>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="rounded-lg p-1.5 text-faint transition-colors hover:bg-rose/10 hover:text-rose"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </div>
        )}

        {tab === "text" && (
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE}
              spellCheck={false}
              className="min-h-[220px] w-full resize-y rounded-2xl border border-line bg-[#050b12] p-4 font-mono2 text-[12.5px] leading-relaxed text-fg placeholder:text-faint/70 focus:border-mint/50 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="m-0 font-mono2 text-[10px] uppercase tracking-[0.18em] text-faint">
                {text.length} chars · shorthand ok
              </p>
              <button
                onClick={() => setText(EXAMPLE)}
                className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-cy transition-colors hover:text-mint"
              >
                load example
              </button>
            </div>
          </div>
        )}
      </div>

      <button onClick={deploy} disabled={!ready || disabled} className="btn btn-primary mt-6 h-[50px] w-full text-[14px]">
        <FlaskConical size={16} />
        {disabled ? "Agents deployed…" : "Deploy the agent team"}
      </button>
      <p className="m-0 mt-3 text-center text-[11px] leading-relaxed text-faint">
        Documents stay in your database. Only medicine names are queried against public
        NIH / FDA reference APIs.
      </p>
    </div>
  );
}
