import { ShieldAlert, HeartPulse } from "lucide-react";
import { Logo } from "./nav";

export default function Footer() {
  return (
    <footer className="relative border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="glass flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:gap-6 md:p-6">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber/30 bg-amber/10">
            <ShieldAlert size={18} className="text-amber" />
          </span>
          <p className="m-0 text-[13px] leading-relaxed text-dim">
            <span className="font-semibold text-fg">Medical disclaimer.</span> AarogyaCare AI is an intelligent
            reading & guidance assistant, not a substitute for clinical diagnosis. Extracted text, timings,
            and interactions may contain variances — always verify your prescription with your doctor or pharmacist.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <div className="leading-tight">
              <p className="m-0 font-display text-[15px] font-bold text-fg">
                Aarogya<span className="text-mint">Care AI</span>
              </p>
              <p className="m-0 font-mono2 text-[9px] uppercase tracking-[0.24em] text-faint">
                read · enrich · translate · protect · care
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-faint">
            <HeartPulse size={14} className="text-rose" />
            <p className="m-0 font-mono2 text-[10px] uppercase tracking-[0.2em]">
              Powered by 5 Autonomous Clinical Agents · NIH RxNav · openFDA
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
