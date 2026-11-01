# Aarogya Care AI — Full-Stack Agentic Healthcare Assistance Platform

**Aarogya Care AI** is a production-ready, full-stack healthcare platform powered by an autonomous **multi-agent AI pipeline**, **Google Gemini AI**, and **Supabase**. It transforms complex, illegible doctor prescriptions, Latin medical shorthand, and laboratory test reports into compassionate, crystal-clear plain English that patients and caregivers can understand and act upon.

---

## 🌟 Key Capabilities

### 1. Prescription Understanding Agent (Gemini 3.8 Flash Vision)
- **High-Fidelity OCR:** Accepts **JPG, JPEG, PNG, and PDF** files. Faithfully reads printed and handwritten doctor prescriptions.
- **Structured Extraction:** Identifies medicine names, dosage forms (tablets, capsules, syrups, injections), strengths, dosing frequencies (`1-0-1`, `OD`, `BD`, `TDS`, `AC`, `PC`), timing, and durations.
- **Safety First — Never Guesses:** If handwriting is illegible, blurry, or ambiguous, it explicitly flags `⚠️ Verification Warning` with details rather than guessing missing dosages.
- **Distinguishes Facts from Explanations:** Separates raw extracted clinical facts from simplified patient guidance.
- **Preserves Doctor Instructions:** Doctor precautions and follow-up notes are maintained verbatim.

### 2. Medical Report Understanding Agent
- **Diagnostic Test Breakdown:** Extracts test names, result values, units, and stated laboratory reference ranges.
- **Out-of-Range Flags:** Identifies values outside normal parameters and flags them as `HIGH`, `LOW`, or `ABNORMAL`.
- **Plain English Explanations:** Explains what each test measures in simple, everyday language (e.g., HbA1c, Fasting Glucose, Lipid Profile, Creatinine, TSH).
- **Medical Safety Mandate:** Never makes diagnostic disease claims based on isolated numbers. Clearly recommends discussing out-of-range results with a qualified physician.

### 3. Patient Portal & Dashboard
- **Personalized Patient Header:** Prominently displays the patient's **Full Name**, **Age**, **Gender**, and unique **Patient ID** (e.g., `AC-54892`).
- **Medical Document Center:** Drag-and-drop upload zone for prescriptions and lab reports in JPG, PNG, or PDF formats (up to 15 MB).
- **View Original Documents:** Dedicated modal and new-tab preview to inspect the original uploaded prescription scan or lab PDF.
- **Download Medical Care Plan:** One-click text / printable download of the full AI-generated medical explanation.
- **Document Deletion:** Securely delete past records and their AI analyses with cascade removal from database and storage.
- **Recent Reports Vault:** Displays summary headlines, medicine counts, interaction warnings, and direct links to comprehensive care guides.

### 4. Autonomous 5-Agent Pipeline
- **Agent 1: LUMEN (Document Vision Agent):** Uses Gemini 3.8 Flash multimodal vision to read handwriting and diagnostic tables.
- **Agent 2: MEDSCOPE (Clinical Verification Agent):** Cross-references active molecules against NIH RxNav and openFDA label databases.
- **Agent 3: PLAINWORDS (Patient Translation Agent):** Rewrites clinical shorthand into friendly 6th-grade English.
- **Agent 4: GUARDIAN (Safety & Interaction Radar):** Sweeps medicine combinations for dangerous contraindications and food precautions.
- **Agent 5: SATHI (Care Routine & Voice Companion):** Synthesizes a 24-hour visual timetable (Morning, Noon, Evening, Bedtime), generates doctor visit questions, and powers interactive conversational chat.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **AI Engine:** Google Gemini AI (`@google/genai` official SDK — model: `gemini-3.8-flash`)
- **Backend & Database:** Supabase (Auth, PostgreSQL DB, Row Level Security, Storage) + Drizzle ORM
- **Styling & UI:** Tailwind CSS v4 + Framer Motion animations + Lucide Icons
- **Clinical APIs:** NIH RxNav REST API + openFDA Drug Label Database
- **Audio / Accessibility:** Web Speech Synthesis API (Audio guide reader)
- **Document Processing:** Multimodal Vision + `pdf-parse`

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Integration
NEXT_PUBLIC_SUPABASE_URL=https://wcuxsvssevnspuklhcgx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_1km4DIUrO-laf4bCezZIuQ_fv-StrwX
SUPABASE_PUBLISHABLE_KEY=sb_publishable_1km4DIUrO-laf4bCezZIuQ_fv-StrwX

# Google Gemini AI Integration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Optional: Supabase Service Role Key (for admin backend operations)
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: PostgreSQL direct connection string (if using Drizzle with Supabase pooler)
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.wcuxsvssevnspuklhcgx.supabase.co:5432/postgres
```

---

## 🗄️ Supabase Database & Storage Setup

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project (**`wcuxsvssevnspuklhcgx`**).
3. In the left navigation, click **SQL Editor**.
4. Open the [`supabase/schema.sql`](supabase/schema.sql) file from this repository.
5. Paste the entire SQL script and click **Run**.

### What `supabase/schema.sql` configures:
- **`users` Table:** Patient profiles with unique `patient_id` linked to `auth.users`.
- **`documents` Table:** Uploaded prescriptions and lab reports with file metadata.
- **`runs` Table:** AI processing sessions and status tracking.
- **`agent_events` Table:** Real-time event log for LUMEN, MEDSCOPE, PLAINWORDS, GUARDIAN, and SATHI.
- **`analyses` Table:** Structured AI medical explanations and care plans.
- **`medicine_cache` Table:** High-speed cache for openFDA / RxNav clinical data.
- **Row Level Security (RLS):** Policies enforcing strict patient isolation (users can only access their own documents).
- **`medical-documents` Private Storage Bucket:** Strict private bucket with RLS policies allowing authenticated patients to upload, view, and delete their own files.

---

## 🚀 Running Locally

### 1. Install Dependencies
```bash
cd "C:\Users\hansi\Downloads\Aarogya care ai"
npm install
```

### 2. Verify TypeScript Types
```bash
npm run typecheck
```

### 3. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Test Demo Patient Account
You can log in immediately using the pre-seeded demo patient or create a new account:
- **Email:** `ramesh@aarogyacare.ai`
- **Phone:** `9876543210`
- **Password:** `password123`
- **Patient ID:** `AC-54892`

---

## 🌐 Deploying to Vercel

1. Push your code to a GitHub / GitLab repository.
2. In the [Vercel Dashboard](https://vercel.com/), click **Add New Project** and select your repository.
3. In the **Environment Variables** section, configure:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL=gemini-3.8-flash`
4. The build command will automatically run:
   ```bash
   next build --webpack
   ```
5. Click **Deploy**. Your application will be live with full Supabase and Gemini AI integration.

---

## ⚕️ Medical & Clinical Safety Disclaimer

Aarogya Care AI is designed to assist patients in understanding their prescriptions and laboratory reports. It is strictly an informational tool and **not** a substitute for professional medical judgment, diagnosis, or clinical advice. Never alter your medication dosage, stop taking prescribed medicines, or ignore professional medical guidance based on AI output. For any urgent symptoms or health emergencies, seek immediate care from a qualified healthcare provider.
