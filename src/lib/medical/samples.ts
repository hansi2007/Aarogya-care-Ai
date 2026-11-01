export interface SampleDoc {
  id: string;
  title: string;
  kind?: "sample";
  docType: "Prescription slip" | "Lab report";
  caption: string;
  imageSrc: string;
  rawText: string;
}

export const SAMPLES: SampleDoc[] = [
  {
    id: "sample-chronic",
    title: "Chronic care follow-up",
    docType: "Prescription slip",
    caption: "Dr. A. Verma · Internal Medicine · handwritten slip",
    imageSrc: "/samples/rx-slip-1.png",
    rawText: `CITY CARE CLINIC
Dr. A. Verma, MD (Internal Medicine)   Reg. No. 44120

Patient: Ramesh K., 54/M          Date: 12/02/2026
Dx: T2DM, HTN, Dyslipidemia

Rx
1. Tab Metformin 500mg — 1-0-1 PC x 90 days
2. Tab Glimepiride 2mg — 1-0-0 AC x 90 days
3. Tab Amlodipine 5mg — 0-0-1 x 90 days
4. Tab Atorvastatin 20mg — 0-0-1 HS x 90 days
5. Cap Vitamin D3 60,000 IU — 1 cap once weekly x 8 weeks

Advice: low salt diet, 30 min walk daily, monitor BP at home.
Review after 3 months with FBS + HbA1c report.`,
  },
  {
    id: "sample-acute",
    title: "Throat infection course",
    docType: "Prescription slip",
    caption: "Dr. S. Rao · ENT · handwritten slip",
    imageSrc: "/samples/rx-slip-2.png",
    rawText: `SUNRISE ENT CLINIC
Dr. S. Rao, MS (ENT)

Patient: Anita D., 29/F           Date: 03/03/2026
C/O: throat pain x 3 days, fever, body ache
Dx: Acute Pharyngitis (URTI)

Rx
1. Tab Amoxicillin 500mg — 1-1-1 PC x 5 days
2. Tab Paracetamol 650mg — 1-0-1 SOS fever x 3 days
3. Tab Cetirizine 10mg — 0-0-1 HS x 5 days
4. Povidone gargle — BD with warm water

Advice: plenty of warm fluids, rest voice.
Review if fever persists beyond 3 days.`,
  },
  {
    id: "sample-lab",
    title: "Metabolic lab panel",
    docType: "Lab report",
    caption: "Metropolis Diagnostics · printed report",
    imageSrc: "/samples/lab-report.png",
    rawText: `METROPOLIS DIAGNOSTICS
Comprehensive Metabolic Panel

Patient: Ramesh K., 54/M
Referred by: Dr. A. Verma         Date: 10/02/2026

TEST                      RESULT     UNITS      REF RANGE      FLAG
HbA1c                     8.2        %          4.0 - 5.6      H
Fasting Glucose           148        mg/dL      70 - 100       H
Total Cholesterol         232        mg/dL      < 200          H
HDL Cholesterol           41         mg/dL      40 - 60
LDL Cholesterol           158        mg/dL      < 100          H
Triglycerides             210        mg/dL      < 150          H
Serum Creatinine          1.1        mg/dL      0.7 - 1.3
TSH                       2.4        uIU/mL     0.4 - 4.0

Verified by: Dr. P. Nair (Pathologist)`,
  },
];

export function getSample(id: string) {
  return SAMPLES.find((s) => s.id === id);
}
