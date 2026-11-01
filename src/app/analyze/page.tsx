import Nav from "@/components/nav";
import Footer from "@/components/footer";
import AnalyzeApp from "@/components/analyze/analyze-app";

export const metadata = {
  title: "Prescription Analyzer — AarogyaCare AI",
  description: "Deploy 5 AI agents to decode, check interactions, schedule routines, and translate doctor prescriptions.",
};

export default function AnalyzePage() {
  return (
    <>
      <Nav />
      <main className="relative min-h-screen pb-24 pt-[104px] md:pt-[120px]">
        <div className="grid-bg absolute inset-x-0 top-0 h-[520px]" />
        <div className="glow-orb absolute -left-40 top-20 h-[420px] w-[420px] bg-[#2ee6c010]" />
        <div className="glow-orb absolute -right-40 top-72 h-[420px] w-[420px] bg-[#58b7f80e]" />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <div className="mb-10 max-w-2xl">
            <span className="eyebrow">the analyzer</span>
            <h1 className="h-display mt-5 text-[clamp(2rem,4.5vw,3.2rem)] text-fg">
              Deploy the <span className="text-grad">agent team.</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-dim">
              One document in — a structured, enriched, plain-English, safety-checked report out.
              Every agent move streams live.
            </p>
          </div>
          <AnalyzeApp />
        </div>
      </main>
      <Footer />
    </>
  );
}
