import { TARGETS, calcTotals } from '../utils';
import { GEMINI_KEY } from '../config';

const MODEL = "gemini-2.5-flash";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;

async function callGemini(system, msg, maxTokens = 4000) {
  if (!GEMINI_KEY) throw new Error("Gemini API key not set in src/config.js");
  const r = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: msg }] }],
      generationConfig: { maxOutputTokens: maxTokens },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    }),
  });
  if (!r.ok) {
    const e = await r.json();
    throw new Error(e.error?.message || `Gemini API error ${r.status}`);
  }
  const d = await r.json();
  const text = d.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!text) {
    const reason = d.candidates?.[0]?.finishReason;
    const safety = d.candidates?.[0]?.safetyRatings;
    throw new Error(`Gemini returned empty (reason: ${reason})`);
  }
  return text;
}

export async function analyzeMeal(label, desc) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t = await callGemini(
      `Sports nutritionist. Return ONLY valid JSON:\n{"items":[{"name":"string","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"total_calories":number,"total_protein_g":number,"total_carbs_g":number,"total_fat_g":number}`,
      `${label}: ${desc}`
    );
    const clean = t.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(clean);
    } catch (e) {
      console.error(`Gemini meal analysis attempt ${attempt} failed. Raw response:`, t);
      console.error(`Cleaned response:`, clean);
      if (attempt === 3) {
        throw new Error(`Invalid JSON from Gemini after 3 attempts: ${e.message}. Last response: ${clean}`);
      }
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

export async function estimateWorkout(desc) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t = await callGemini(
      `Sports scientist. User 78kg very fit. Return ONLY valid JSON:\n{"calories_burnt":number,"duration_min":number,"activity":"string"}`,
      desc
    );
    const clean = t.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(clean);
    } catch (e) {
      console.error(`Gemini workout analysis attempt ${attempt} failed. Raw response:`, t);
      console.error(`Cleaned response:`, clean);
      if (attempt === 3) {
        throw new Error(`Invalid JSON from Gemini after 3 attempts: ${e.message}. Last response: ${clean}`);
      }
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

export async function genDayReport(data, date) {
  const tot = calcTotals(data.meals || {}), b = data.workout?.calories_burnt || 0;
  return callGemini(
    "Expert sports nutritionist.",
    `Athlete:78kg,181cm,27y,Hyrox 3×+Swim 2×/week,Build Muscle\nTargets:${TARGETS.calories}kcal,${TARGETS.protein_g}gP,${TARGETS.carbs_g}gC,${TARGETS.fat_g}gF\nDate:${date}\nMeals:\n${Object.entries(data.meals || {}).map(([k, m]) => `${k}:${m.total_calories}kcal — ${m.items?.map((i) => i.name).join(", ")}`).join("\n")}\nWorkout:${data.workout ? `${data.workout.activity},${data.workout.duration_min}min,${b}kcal burnt` : "None"}\nTotals:${tot.calories}kcal,${tot.calories - b}net,${tot.protein_g}gP\nSections(3-5 bullets): OVERVIEW/WHAT WENT WELL/AREAS TO IMPROVE/MEAL QUALITY NOTES/WORKOUT NUTRITION/RECOMMENDATIONS FOR TOMORROW`,
    1500
  );
}

export async function gen7DayReport(days) {
  const avgCal = Math.round(days.reduce((s, d) => s + calcTotals(d.meals || {}).calories, 0) / days.length);
  const avgP = Math.round(days.reduce((s, d) => s + calcTotals(d.meals || {}).protein_g, 0) / days.length);
  return callGemini(
    "Expert sports nutritionist.",
    `Athlete:78kg,181cm,27y,Build Muscle\n${days.map((d) => { const t = calcTotals(d.meals || {}); return `${d.date}:${t.calories}kcal,${t.protein_g}gP,${d.workout?.calories_burnt || 0}burnt`; }).join("\n")}\nAverages:${avgCal}kcal/day,${avgP}g protein\nSections(4-6 bullets): WEEKLY OVERVIEW/CONSISTENCY/WHAT WENT WELL/AREAS TO IMPROVE/NUTRITION TRENDS/WORKOUT FUELING/GOALS FOR NEXT WEEK`,
    2000
  );
}
