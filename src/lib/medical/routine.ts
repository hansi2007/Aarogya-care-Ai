import type { EnrichedMed, Interaction, RoutineSlot, DoctorQuestion, StructuredRx, Medicine } from "./types";

export function buildRoutineSchedule(
  structured: StructuredRx,
  enriched: EnrichedMed[],
): RoutineSlot[] {
  const morningBeforeFood: RoutineSlot["meds"] = [];
  const morningAfterFood: RoutineSlot["meds"] = [];
  const noonMeds: RoutineSlot["meds"] = [];
  const eveningMeds: RoutineSlot["meds"] = [];
  const bedtimeMeds: RoutineSlot["meds"] = [];
  const weeklyMeds: RoutineSlot["meds"] = [];

  for (const m of structured.medicines) {
    const rawLower = (m.rawLine || m.name).toLowerCase();
    const sig = (m.sigCode || "").toLowerCase();
    const timing = (m.timing || "").toLowerCase();
    const perDay = m.perDay;
    const nameWithStrength = `${m.name}${m.strength ? ` ${m.strength}` : ""}`;

    // Find purpose from enriched
    const match = enriched.find((e) => e.medId === m.id || e.name.toLowerCase() === m.name.toLowerCase());
    const purpose = match?.usesPlain || match?.drugClass || "Prescribed clinical treatment";

    // Weekly medicines (e.g. Vitamin D3)
    if (rawLower.includes("weekly") || rawLower.includes("once a week") || rawLower.includes("sunday") || rawLower.includes("60,000")) {
      weeklyMeds.push({
        name: nameWithStrength,
        dosage: "1 dose weekly (e.g. Every Sunday morning with milk)",
        instructions: "Swallow whole with a glass of milk or with a meal containing healthy fats for best absorption.",
        purpose,
      });
      continue;
    }

    // PRN / SOS medicines
    if (m.prn || rawLower.includes("sos") || rawLower.includes("as needed")) {
      noonMeds.push({
        name: nameWithStrength,
        dosage: `${m.form} (As needed / SOS)`,
        instructions: "Take only when symptoms (fever, pain, discomfort) arise. Keep at least 4-6 hours between doses.",
        purpose,
      });
      continue;
    }

    const isAC = sig.includes("ac") || timing.includes("before") || rawLower.includes("empty stomach") || rawLower.includes("before meal");
    const isHS = sig.includes("hs") || timing.includes("bed") || timing.includes("night") || rawLower.includes("bedtime");

    // Check Morning Slot
    if (perDay ? perDay[0] > 0 : (isAC || rawLower.includes("od") || rawLower.includes("1-0-0") || rawLower.includes("1-1-1") || rawLower.includes("1-0-1"))) {
      if (isAC) {
        morningBeforeFood.push({
          name: nameWithStrength,
          dosage: `1 ${m.form} (${m.strength || ""})`,
          instructions: "Take 30 minutes before breakfast with a glass of plain water.",
          purpose,
        });
      } else {
        morningAfterFood.push({
          name: nameWithStrength,
          dosage: `1 ${m.form} (${m.strength || ""})`,
          instructions: "Take immediately after finishing breakfast to protect stomach lining.",
          purpose,
        });
      }
    }

    // Check Afternoon (Noon) Slot
    if (perDay ? perDay[1] > 0 : (rawLower.includes("1-1-1") || rawLower.includes("tds") || rawLower.includes("tid"))) {
      noonMeds.push({
        name: nameWithStrength,
        dosage: `1 ${m.form} (${m.strength || ""})`,
        instructions: "Take with or right after lunch.",
        purpose,
      });
    }

    // Check Evening / Bedtime
    if (perDay ? perDay[2] > 0 : (isHS || rawLower.includes("0-0-1") || rawLower.includes("1-0-1") || rawLower.includes("bd") || rawLower.includes("bid"))) {
      if (isHS || rawLower.includes("atorva") || rawLower.includes("statin") || rawLower.includes("cetirizine") || rawLower.includes("montelukast")) {
        bedtimeMeds.push({
          name: nameWithStrength,
          dosage: `1 ${m.form} (${m.strength || ""})`,
          instructions: "Take 30 minutes before sleep with water. Helps work optimally while body rests.",
          purpose,
        });
      } else {
        eveningMeds.push({
          name: nameWithStrength,
          dosage: `1 ${m.form} (${m.strength || ""})`,
          instructions: "Take after dinner with a full glass of water.",
          purpose,
        });
      }
    }
  }

  const routine: RoutineSlot[] = [];

  if (morningBeforeFood.length > 0) {
    routine.push({
      slot: "morning",
      title: "Morning · Before Breakfast",
      timeRange: "7:00 AM – 8:00 AM",
      foodRelation: "before_food",
      meds: morningBeforeFood,
    });
  }

  if (morningAfterFood.length > 0) {
    routine.push({
      slot: "morning",
      title: "Morning · After Breakfast",
      timeRange: "8:30 AM – 9:30 AM",
      foodRelation: "after_food",
      meds: morningAfterFood,
    });
  }

  if (noonMeds.length > 0) {
    routine.push({
      slot: "noon",
      title: "Afternoon · With Lunch / As Needed",
      timeRange: "1:00 PM – 2:00 PM",
      foodRelation: "with_food",
      meds: noonMeds,
    });
  }

  if (eveningMeds.length > 0) {
    routine.push({
      slot: "evening",
      title: "Evening · After Dinner",
      timeRange: "7:30 PM – 8:30 PM",
      foodRelation: "after_food",
      meds: eveningMeds,
    });
  }

  if (bedtimeMeds.length > 0) {
    routine.push({
      slot: "bedtime",
      title: "Night · Right Before Bed",
      timeRange: "9:30 PM – 10:30 PM",
      foodRelation: "anytime",
      meds: bedtimeMeds,
    });
  }

  if (weeklyMeds.length > 0) {
    routine.push({
      slot: "weekly",
      title: "Weekly Dosage · Designated Day",
      timeRange: "Once Every Sunday",
      foodRelation: "with_food",
      meds: weeklyMeds,
    });
  }

  return routine;
}

export function buildDoctorQuestions(
  structured: StructuredRx,
  enriched: EnrichedMed[],
  interactions: Interaction[],
): DoctorQuestion[] {
  const questions: DoctorQuestion[] = [];

  if (interactions.length > 0) {
    questions.push({
      question: `Are the combinations of ${interactions[0].drugA} and ${interactions[0].drugB} suitable for my long-term kidney and liver health?`,
      reason: "An interaction was flagged between these medications, so spacing or dose adjustments may be recommended.",
    });
  }

  const hasDiabetes = structured.conditions.some((c) => /diabet|t2dm|dm/i.test(c.name)) ||
    enriched.some((e) => /sugar|diabet|glucose/i.test(e.usesPlain || ""));
  if (hasDiabetes) {
    questions.push({
      question: "What is my target Fasting and Post-Meal blood sugar number, and what should I do if I experience sudden shakiness or sweating?",
      reason: "Diabetes medications can cause mild hypoglycaemia (low sugar). Having clear target ranges ensures safe self-monitoring.",
    });
  }

  const hasHTN = structured.conditions.some((c) => /hypert|bp|htn/i.test(c.name)) ||
    enriched.some((e) => /pressure|hypert/i.test(e.usesPlain || ""));
  if (hasHTN) {
    questions.push({
      question: "How frequently should I log my home blood pressure, and at what reading should I contact the clinic immediately?",
      reason: "Home BP tracking provides better real-world insights than occasional clinic readings.",
    });
  }

  const hasAntibiotic = enriched.some((e) => /antibiotic|infection|amoxicillin|azithro|cipro/i.test(e.drugClass || e.usesPlain || ""));
  if (hasAntibiotic) {
    questions.push({
      question: "Should I take a probiotic or curd/yogurt to protect my digestive gut health while finishing this antibiotic course?",
      reason: "Antibiotics kill beneficial gut bacteria; supporting gut flora prevents antibiotic-associated diarrhea.",
    });
  }

  const hasStatin = enriched.some((e) => /statin|cholesterol|atorva|rosuva/i.test(e.name || e.drugClass || ""));
  if (hasStatin) {
    questions.push({
      question: "Should we schedule a follow-up liver enzyme test (SGOT/SGPT) and lipid profile in 3 to 6 months?",
      reason: "Statins are metabolized by the liver; periodic baseline panel verification is standard clinical care.",
    });
  }

  // General questions if few generated
  if (questions.length < 3) {
    questions.push({
      question: "For how many weeks or months should I continue this current medicine set before my next checkup?",
      reason: "Knowing the exact treatment duration prevents premature discontinuation or unnecessary refills.",
    });
    questions.push({
      question: "Are there any over-the-counter pain or cold medicines I should avoid taking alongside my current prescriptions?",
      reason: "Common over-the-counter NSAIDs like ibuprofen or naproxen can elevate blood pressure and strain kidneys.",
    });
  }

  return questions.slice(0, 5);
}
