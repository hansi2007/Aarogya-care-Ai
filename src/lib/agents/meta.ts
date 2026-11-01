import type { AgentMeta } from "@/lib/medical/types";

export const AGENTS: AgentMeta[] = [
  {
    key: "vision",
    codename: "LUMEN",
    name: "Document Reader Agent",
    role: "Reads slips, PDFs & lab reports with vision OCR, then structures every clinical entity.",
    color: "#38E0C8",
    tools: ["Vision OCR", "Deskew pipeline", "Rx shorthand grammar"],
  },
  {
    key: "enrich",
    codename: "MEDSCOPE",
    name: "Web Intelligence Agent",
    role: "Scrapes NIH RxNav & the openFDA label database for every detected medicine.",
    color: "#5AB2FF",
    tools: ["NIH RxNav API", "openFDA labels", "Live web fetch"],
  },
  {
    key: "simplify",
    codename: "PLAINWORDS",
    name: "Translation Agent",
    role: "Rewrites clinical jargon into warm, plain English anyone can understand.",
    color: "#A78BFA",
    tools: ["Term graph", "Sig decoder", "Reading-level engine"],
  },
  {
    key: "safety",
    codename: "GUARDIAN",
    name: "Interaction Agent",
    role: "Cross-references the full medicine set against live drug–drug interaction data.",
    color: "#FFB454",
    tools: ["RxNav interaction graph", "Rule engine", "Duplicate therapy scan"],
  },
  {
    key: "companion",
    codename: "SATHI",
    name: "Patient Care Companion Agent",
    role: "Builds a daily visual medicine routine, generates doctor questions, and powers interactive patient Q&A.",
    color: "#4ADE80",
    tools: ["Daily timetable engine", "Doctor visit generator", "Speech synthesizer", "Patient Q&A engine"],
  },
];
