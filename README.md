# AarogyaCare AI — Agentic Medical Prescription & Guidance Assistant

AarogyaCare AI is an intelligent healthcare web application powered by an autonomous **multi-agent AI pipeline**. It transforms complex, illegible doctor prescriptions, Latin shorthand, and laboratory reports into compassionate, crystal-clear plain English that patients and caregivers can understand and act upon.

---

## 🌟 Key Capabilities

1. **Autonomous 5-Agent Pipeline**
   - **Agent 1: LUMEN (Document Vision & Decipher Agent)**: Reads prescription slips, handwritten doctor notes, digital PDFs, and lab panels. Decodes medical sig codes (`1-0-1`, `OD`, `BD`, `TDS`, `AC`, `PC`, `HS`, `SOS`).
   - **Agent 2: MEDSCOPE (Web Intelligence & Clinical Verification Agent)**: Cross-references live NIH RxNav and openFDA label databases for active ingredients, RxNorm CUIs, FDA warnings, and mechanism of action.
   - **Agent 3: PLAINWORDS (Patient Translation Agent)**: Rewrites clinical jargon into compassionate 5th-grade reading level English. Explains *what* each pill does in simple terms.
   - **Agent 4: GUARDIAN (Safety & Drug Interaction Radar Agent)**: Sweeps all medicine pairs for dangerous contraindications, duplicate therapies, and severe interaction risks.
   - **Agent 5: SATHI (Care Routine & Patient Companion Agent)**: Synthesizes a daily visual pill timetable, prepares tailored doctor visit questions, and powers interactive conversational patient Q&A.

2. **Patient-Centric Medical UI/UX Design**
   - **Daily Visual Medicine Timetable**: Morning (before & after breakfast), Afternoon (lunch), Evening (dinner), Bedtime (sleep), and Weekly slots with food relation badges and checkable dose tracking.
   - **Text-to-Speech Audio Readout**: Voice reader reads out the medicine guide and schedule aloud for elderly or visually impaired patients.
   - **Interactive AI Companion Chat ("Ask Aarogya Sathi")**: Instant answers to common questions ("Can I take this with milk?", "What if I miss a dose?", "Dietary foods to avoid?").
   - **Doctor Visit Checklist**: Generates targeted questions for the patient's next clinical consultation.
   - **Print / Save Caregiver Summary**: One-click printable care card to stick on the medicine cabinet or refrigerator.
   - **Dual Display Modes**: Toggle between **Patient Easy View** (simple English) and **Clinical Detail View** (for doctors & pharmacists).

3. **Zero-Configuration Standalone & Production Ready**
   - **Dual-Engine Persistence**: Seamlessly uses PostgreSQL via Drizzle ORM when `DATABASE_URL` is set, or automatically falls back to an embedded JSON-backed reactive store when running locally without a database server.
   - **Offline & Live Multimodal Vision**: Ships with pre-loaded high-resolution clinical sample prescriptions (Chronic care, Acute URTI, Metabolic lab panel), plus live vision support for OpenAI GPT-4o, Anthropic Claude, and Gemini.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

---

## ⚙️ Environment Configuration (Optional)

AarogyaCare AI runs 100% out-of-the-box in local demo mode without any required environment variables. To unlock live external LLM/Vision APIs and PostgreSQL:

Create a `.env` or `.env.local` file in the root folder:

```env
# Optional: External Multimodal OCR & LLM Vision
OPENAI_API_KEY=your_openai_api_key_here
# or
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: PostgreSQL Database (auto-falls back to local store if not set)
DATABASE_URL=postgres://user:password@localhost:5432/aarogya_db
```

---

## 🏗️ Architecture & Technology Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling & UI**: Tailwind CSS v4 + Framer Motion animations + Lucide Icons
- **Database & Persistence**: Drizzle ORM + PostgreSQL / Universal Local JSON Store Fallback
- **Clinical APIs**: NIH RxNav REST API + openFDA Drug Label API
- **Audio / Accessibility**: Web Speech Synthesis API
- **Document Processing**: Sharp + Multimodal Vision OCR + PDF Text Extraction
