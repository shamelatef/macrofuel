import { useState, useRef } from "react";
import { fsGet, fsSet, fsList, fsDelete } from "./api/firestore";
import { analyzeMeal, estimateWorkout, genDayReport, gen7DayReport } from "./api/gemini";
import { TARGETS, BASE_SLOTS, CIRC, mono, calcTotals, exportHTMLReport } from "./utils";
import { todayStr, fmtDate, fmtShort } from "./dates";
import { MiniBar, MacroBar, Spinner, Toast, EditBtn, LogBtn, ExportBtn } from "./components/ui";
import MealEditor from "./components/MealEditor";
import WorkoutEditor from "./components/WorkoutEditor";
import AuthScreen from "./components/AuthScreen";
import MealCard from "./components/MealCard";

export default function App() {
  const [auth, setAuth] = useState(null);
  const [view, setView] = useState("log");
  const [dayData, setDayData] = useState({ meals: {}, workout: null });
  const [savedDays, setSavedDays] = useState([]);
  const [loadingMeal, setLoadingMeal] = useState(null);
  const [loadingWkt, setLoadingWkt] = useState(false);
  const [mealInputs, setMealInputs] = useState({});
  const [wktInput, setWktInput] = useState("");
  const [expandedDay, setExpandedDay] = useState(null);
  const [loadingHist, setLoadingHist] = useState(false);
  const [snackCount, setSnackCount] = useState(1);
  const [expDay, setExpDay] = useState(null);
  const [expWeek, setExpWeek] = useState(false);
  const [expToday, setExpToday] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "ok" });
  const [editing, setEditing] = useState(null);
  const toastRef = useRef();

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ msg: "", type: "ok" }), 3500);
  }

  const SLOTS = [
    ...BASE_SLOTS,
    ...Array.from({ length: snackCount }, (_, i) => ({
      key: i === 0 ? "snacks" : `snacks_${i + 1}`,
      label: snackCount === 1 ? "Snack" : `Snack ${i + 1}`,
      emoji: ["🍎", "🥜", "🍌", "🍫", "🥛"][i % 5],
    })),
  ];
  const dPath = (uid, date) => `users/${uid}/days/${date}`;
  const hPath = (uid) => `users/${uid}/days`;

  async function onAuth(user) {
    setAuth(user);
    try {
      const d = await fsGet(dPath(user.uid, todayStr()), user.idToken);
      if (d) setDayData(d);
    } catch (e) {
      showToast("Could not load today: " + e.message, "error");
    }
  }
  function handleSignOut() {
    setAuth(null);
    setDayData({ meals: {}, workout: null });
    setSavedDays([]);
    setView("log");
  }

  async function saveDay(data, user = auth) {
    try {
      await fsSet(dPath(user.uid, todayStr()), data, user.idToken);
    } catch (e) {
      showToast("Save failed: " + e.message, "error");
    }
  }
  async function loadHistory() {
    setLoadingHist(true);
    try {
      setSavedDays(await fsList(hPath(auth.uid), auth.idToken));
    } catch (e) {
      showToast("Could not load history: " + e.message, "error");
    }
    setLoadingHist(false);
  }

  async function handleSaveMeal(savedMeal) {
    const { date, mealKey } = editing;
    if (date === todayStr()) {
      const nd = { ...dayData, meals: { ...dayData.meals, [mealKey]: savedMeal } };
      setDayData(nd);
      await saveDay(nd);
    } else {
      const day = savedDays.find((d) => d.date === date);
      if (!day) return;
      const { date: _, ...data } = { ...day, meals: { ...day.meals, [mealKey]: savedMeal } };
      await fsSet(dPath(auth.uid, date), data, auth.idToken);
      await loadHistory();
    }
    setEditing(null);
    showToast("Meal saved ✓");
  }
  async function handleSaveWorkout(savedWkt) {
    const { date } = editing;
    if (date === todayStr()) {
      const nd = { ...dayData, workout: savedWkt };
      setDayData(nd);
      await saveDay(nd);
    } else {
      const day = savedDays.find((d) => d.date === date);
      if (!day) return;
      const { date: _, ...data } = { ...day, workout: savedWkt };
      await fsSet(dPath(auth.uid, date), data, auth.idToken);
      await loadHistory();
    }
    setEditing(null);
    showToast("Workout saved ✓");
  }

  async function logMeal(key, label) {
    const desc = mealInputs[key]?.trim();
    if (!desc) return;
    setLoadingMeal(key);
    try {
      const r = await analyzeMeal(label, desc);
      const nd = { ...dayData, meals: { ...dayData.meals, [key]: { ...r, description: desc } } };
      setDayData(nd);
      setMealInputs((p) => ({ ...p, [key]: "" }));
      await saveDay(nd);
      await loadHistory();
      showToast(`${label} logged ✓`);
    } catch (e) {
      showToast(e.message || "Failed to analyze meal", "error");
    }
    setLoadingMeal(null);
  }
  async function clearMeal(key) {
    const nd = { ...dayData, meals: { ...dayData.meals } };
    delete nd.meals[key];
    setDayData(nd);
    await saveDay(nd);
    await loadHistory();
  }
  async function logWorkout() {
    if (!wktInput.trim()) return;
    setLoadingWkt(true);
    try {
      const r = await estimateWorkout(wktInput);
      const nd = { ...dayData, workout: { ...r, description: wktInput } };
      setDayData(nd);
      setWktInput("");
      await saveDay(nd);
      await loadHistory();
      showToast("Workout logged ✓");
    } catch (e) {
      showToast(e.message || "Failed to log workout", "error");
    }
    setLoadingWkt(false);
  }
  async function clearWorkout() {
    const nd = { ...dayData, workout: null };
    setDayData(nd);
    await saveDay(nd);
    await loadHistory();
  }
  async function deleteDay(date) {
    await fsDelete(dPath(auth.uid, date), auth.idToken);
    await loadHistory();
    if (expandedDay === date) setExpandedDay(null);
    showToast("Day deleted");
  }

  async function handleExportToday() {
    setExpToday(true);
    try {
      const r = await genDayReport(dayData, todayStr());
      const t = calcTotals(dayData.meals || {}), b = dayData.workout?.calories_burnt || 0;
      exportHTMLReport(`Daily Report — ${fmtDate(todayStr())}`, r, `${t.calories}kcal · ${b} burnt`);
    } catch {
      showToast("Export failed", "error");
    }
    setExpToday(false);
  }
  async function handleExportDay(date, data) {
    setExpDay(date);
    try {
      const r = await genDayReport(data, date);
      const t = calcTotals(data.meals || {}), b = data.workout?.calories_burnt || 0;
      exportHTMLReport(`Daily Report — ${fmtDate(date)}`, r, `${t.calories}kcal · ${b} burnt`);
    } catch {
      showToast("Export failed", "error");
    }
    setExpDay(null);
  }
  async function handleExport7Days() {
    setExpWeek(true);
    try {
      const last = savedDays.slice(0, 7);
      const r = await gen7DayReport(last);
      exportHTMLReport(`7-Day Report`, r, `${last.length} days`);
    } catch {
      showToast("Export failed", "error");
    }
    setExpWeek(false);
  }

  function getEditingMeal() {
    if (!editing || editing.workout) return null;
    const { date, mealKey } = editing;
    if (date === todayStr()) return dayData.meals?.[mealKey] || { items: [] };
    return savedDays.find((d) => d.date === date)?.meals?.[mealKey] || { items: [] };
  }
  function getEditingWorkout() {
    if (!editing || !editing.workout) return null;
    const { date } = editing;
    if (date === todayStr()) return dayData.workout || { activity: "", duration_min: 0, calories_burnt: 0 };
    return savedDays.find((d) => d.date === date)?.workout || { activity: "", duration_min: 0, calories_burnt: 0 };
  }

  const totals = calcTotals(dayData.meals || {});
  const burnt = dayData.workout?.calories_burnt || 0;
  const net = totals.calories - burnt, remaining = TARGETS.calories - net;
  const dash = Math.min(net / TARGETS.calories, 1) * CIRC;

  const tabSt = (active) => ({
    flex: 1,
    padding: "10px 0",
    border: "none",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    background: active ? "linear-gradient(135deg,#6db33f,#4a9a2a)" : "#111610",
    color: active ? "#0a1a08" : "#4a6a4a",
    outline: active ? "none" : "1px solid #1c221c",
    fontFamily: "inherit",
  });

  if (!auth) return <AuthScreen onAuth={onAuth} />;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0d0b", backgroundImage: "radial-gradient(ellipse at 5% 0%,#0f1f10 0%,transparent 45%)", fontFamily: "system-ui,sans-serif", color: "#dde8dd", paddingBottom: 60 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}@keyframes spin{to{transform:rotate(360deg)}}.fu{animation:fadeUp .35s ease both}.hov:hover{border-color:#3a6a2a!important;cursor:pointer}*{box-sizing:border-box}textarea,input{outline:none}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a3a2a;border-radius:4px}`}</style>
      <Toast msg={toast.msg} type={toast.type} />
      {editing && !editing.workout && <MealEditor meal={getEditingMeal()} label={editing.label} onSave={handleSaveMeal} onClose={() => setEditing(null)} />}
      {editing?.workout && <WorkoutEditor workout={getEditingWorkout()} onSave={handleSaveWorkout} onClose={() => setEditing(null)} />}

      {/* Header */}
      <div style={{ textAlign: "center", padding: "24px 20px 12px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 4px" }}>Macro<span style={{ color: "#6db33f" }}>Fuel</span></h1>
        <p style={{ fontSize: 10, color: "#4a6a4a", ...mono, margin: "0 0 10px" }}>78kg · 181cm · 27y · Hyrox 3× · Swim 2× · Build Muscle</p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#111610", border: "1px solid #1c221c", borderRadius: 20, padding: "5px 5px 5px 12px" }}>
          <span style={{ fontSize: 11, color: "#8aaa8a", ...mono }}>{auth.email}</span>
          <button onClick={handleSignOut} style={{ background: "#1c221c", border: "none", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#4a6a4a", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Sign out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: 620, margin: "12px auto 16px", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={tabSt(view === "log")} onClick={() => setView("log")}>⚡ Today</button>
          <button style={tabSt(view === "history")} onClick={() => { setView("history"); loadHistory(); }}>📅 History{savedDays.length > 0 && <span style={{ background: "#1c2e1c", borderRadius: 20, padding: "1px 7px", fontSize: 10, marginLeft: 4 }}>{savedDays.length}</span>}</button>
        </div>
      </div>

      {/* TODAY */}
      {view === "log" && (
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "0 16px" }}>
          <div className="fu" style={{ background: "#111610", border: "1px solid #1c221c", borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0 10px" }}>
              <div style={{ position: "relative", width: 160, height: 160, marginBottom: 12 }}>
                <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="80" cy="80" r="74" fill="none" stroke="#1a241a" strokeWidth="12" />
                  <circle cx="80" cy="80" r="74" fill="none" stroke="url(#cg)" strokeWidth="12" strokeDasharray={`${dash} ${CIRC}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
                  <defs><linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6db33f" /><stop offset="100%" stopColor="#a3e635" /></linearGradient></defs>
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: "#a3e635", ...mono, lineHeight: 1 }}>{net}</span>
                  <span style={{ fontSize: 9, color: "#4a6a4a", letterSpacing: 2, textTransform: "uppercase" }}>net kcal</span>
                  {burnt > 0 && <span style={{ fontSize: 9, color: "#f97316", marginTop: 4 }}>−{burnt} burnt</span>}
                </div>
              </div>
              <div style={{ background: "#0f1f10", border: "1px solid #2a4a1a", borderRadius: 20, padding: "4px 16px", fontSize: 11, ...mono, color: remaining >= 0 ? "#6db33f" : "#f87171" }}>
                {remaining >= 0 ? `⚡ ${remaining} kcal remaining` : `⚠️ ${Math.abs(remaining)} kcal over`}
              </div>
            </div>
            <div style={{ padding: "0 4px" }}>
              <MacroBar label="Protein" val={totals.protein_g} target={TARGETS.protein_g} color="#38bdf8" />
              <MacroBar label="Carbs" val={totals.carbs_g} target={TARGETS.carbs_g} color="#f97316" />
              <MacroBar label="Fat" val={totals.fat_g} target={TARGETS.fat_g} color="#facc15" />
              <MacroBar label="Calories" val={totals.calories} target={TARGETS.calories} color="#a3e635" />
            </div>
            {Object.keys(dayData.meals || {}).length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #1a241a", display: "flex", justifyContent: "flex-end" }}>
                <ExportBtn loading={expToday} bg="linear-gradient(135deg,#6db33f,#4a9a2a)" color="#0a1a08" onClick={handleExportToday}>📄 Export Today's Report</ExportBtn>
              </div>
            )}
          </div>

          {SLOTS.map(({ key, label, emoji }) => {
            const m = dayData.meals?.[key], ld = loadingMeal === key;
            return (
              <div key={key} className="fu" style={{ background: "#111610", border: "1px solid #1c221c", borderRadius: 16, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{emoji} {label}</span>
                  {m && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, ...mono, color: "#a3e635" }}>{m.total_calories} kcal</span>
                      <EditBtn onClick={() => setEditing({ date: todayStr(), mealKey: key, label })} />
                      <button onClick={() => clearMeal(key)} style={{ background: "none", border: "none", color: "#4a3a3a", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>✕</button>
                    </div>
                  )}
                </div>
                {m ? (
                  <div>
                    {m.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < m.items.length - 1 ? "1px solid #1a241a" : "none", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "#c8d8c8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                        <div style={{ display: "flex", gap: 6, fontSize: 9, ...mono, flexShrink: 0 }}>
                          <span style={{ color: "#38bdf8" }}>{item.protein_g}P</span>
                          <span style={{ color: "#f97316" }}>{item.carbs_g}C</span>
                          <span style={{ color: "#facc15" }}>{item.fat_g}F</span>
                          <span style={{ color: "#4a6a4a" }}>{item.calories}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <textarea
                      value={mealInputs[key] || ""}
                      onChange={(e) => setMealInputs((p) => ({ ...p, [key]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) logMeal(key, label); }}
                      placeholder={`What did you have for ${label.toLowerCase()}?`}
                      style={{ flex: 1, background: "#0e130e", border: "1px solid #1c2a1c", borderRadius: 10, padding: "8px 10px", color: "#dde8dd", fontSize: 12, lineHeight: 1.5, minHeight: 60, resize: "none", fontFamily: "inherit" }}
                    />
                    <LogBtn loading={ld} disabled={!mealInputs[key]?.trim()} bg="linear-gradient(135deg,#6db33f,#4a9a2a)" onClick={() => logMeal(key, label)}>Log</LogBtn>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <button onClick={() => setSnackCount((c) => c + 1)} style={{ background: "transparent", border: "1px dashed #2a4a1a", borderRadius: 10, padding: "8px 24px", color: "#6db33f", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Add Snack</button>
            {snackCount > 1 && (
              <button onClick={() => { clearMeal(`snacks_${snackCount}`); setSnackCount((c) => c - 1); }} style={{ background: "transparent", border: "1px dashed #4a1a1a", borderRadius: 10, padding: "8px 16px", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>− Remove</button>
            )}
          </div>

          <div className="fu" style={{ background: "#111610", border: "1px solid #1c2a1c", borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>🔥 Workout</span>
              {dayData.workout && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, ...mono, color: "#f97316" }}>−{dayData.workout.calories_burnt} kcal</span>
                  <EditBtn onClick={() => setEditing({ date: todayStr(), workout: true })} />
                  <button onClick={clearWorkout} style={{ background: "none", border: "none", color: "#4a3a3a", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>✕</button>
                </div>
              )}
            </div>
            {dayData.workout ? (
              <div style={{ fontSize: 11, color: "#8aaa8a", lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, color: "#f97316", marginBottom: 4 }}>{dayData.workout.activity}</div>
                <div style={{ display: "flex", gap: 16, ...mono, fontSize: 10 }}><span>⏱ {dayData.workout.duration_min} min</span><span>🔥 {dayData.workout.calories_burnt} kcal burnt</span></div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  value={wktInput}
                  onChange={(e) => setWktInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) logWorkout(); }}
                  placeholder="Describe today's workout (e.g. 45min Hyrox, 2km swim)"
                  style={{ flex: 1, background: "#0e130e", border: "1px solid #1c2a1c", borderRadius: 10, padding: "8px 10px", color: "#dde8dd", fontSize: 12, lineHeight: 1.5, minHeight: 55, resize: "none", fontFamily: "inherit" }}
                />
                <LogBtn loading={loadingWkt} disabled={!wktInput.trim()} bg="linear-gradient(135deg,#f97316,#ea6900)" onClick={logWorkout}>Log</LogBtn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY */}
      {view === "history" && (
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "0 16px" }}>
          {loadingHist ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#6db33f", animation: `pulse 1.4s ease ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <p style={{ color: "#3a5a3a", fontSize: 11, marginTop: 12, ...mono }}>Loading from Firebase…</p>
            </div>
          ) : savedDays.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "#3a4e3a", ...mono, fontSize: 12 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>No days logged yet
            </div>
          ) : (
            <>
              {savedDays.length >= 2 && (() => {
                const last = savedDays.slice(0, 7);
                const avgCal = Math.round(last.reduce((s, d) => s + calcTotals(d.meals || {}).calories, 0) / last.length);
                const avgP = Math.round(last.reduce((s, d) => s + calcTotals(d.meals || {}).protein_g, 0) / last.length);
                const avgB = Math.round(last.reduce((s, d) => s + (d.workout?.calories_burnt || 0), 0) / last.length);
                return (
                  <div className="fu" style={{ background: "linear-gradient(135deg,#0f1c10,#0a140a)", border: "1px solid #2a4a1a", borderRadius: 16, padding: 14, marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                      {[
                        { v: `${avgCal}`, l: "Avg kcal", c: "#a3e635" },
                        { v: `${avgP}g`, l: "Avg protein", c: "#38bdf8" },
                        { v: `${avgB}`, l: "Avg burnt", c: "#f97316" },
                      ].map((s) => (
                        <div key={s.l} style={{ flex: 1, textAlign: "center", background: "#111610", borderRadius: 10, padding: "10px 4px" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, ...mono, color: s.c }}>{s.v}</div>
                          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#4a6a4a", marginTop: 2 }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <ExportBtn loading={expWeek} bg="linear-gradient(135deg,#38bdf8,#0ea5e9)" color="#0a1a2a" onClick={handleExport7Days}>📊 Export {last.length}-Day Report</ExportBtn>
                  </div>
                );
              })()}
              {savedDays.map((day, di) => {
                const dt = calcTotals(day.meals || {}), db2 = day.workout?.calories_burnt || 0, isOpen = expandedDay === day.date;
                const allSlots = [
                  ...BASE_SLOTS,
                  ...Object.keys(day.meals || {})
                    .filter((k) => k.startsWith("snacks"))
                    .sort()
                    .map((k, i) => ({ key: k, label: k === "snacks" ? "Snack" : `Snack ${i + 1}`, emoji: ["🍎", "🥜", "🍌", "🍫", "🥛"][i % 5] })),
                ];
                return (
                  <div key={day.date} className="fu" style={{ animationDelay: `${di * 0.04}s`, marginBottom: 10 }}>
                    <div className="hov" onClick={() => setExpandedDay(isOpen ? null : day.date)} style={{ background: "#111610", border: `1px solid ${isOpen ? "#3a6a2a" : "#1c221c"}`, borderRadius: isOpen ? "16px 16px 0 0" : 16, padding: "14px 16px", transition: "border-color .2s,border-radius .15s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
                            {fmtShort(day.date)}
                            {day.date === todayStr() && <span style={{ background: "#2a5a1a", color: "#a3e635", fontSize: 9, padding: "2px 8px", borderRadius: 20, marginLeft: 8, ...mono }}>TODAY</span>}
                          </div>
                          <div style={{ display: "flex", gap: 12, fontSize: 10, ...mono, color: "#4a6a4a" }}>
                            <span>{Object.keys(day.meals || {}).length} meals</span>
                            {db2 > 0 && <span style={{ color: "#f97316" }}>🔥 −{db2} kcal</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#a3e635", ...mono }}>{dt.calories}</div>
                          <div style={{ fontSize: 9, color: "#4a6a4a", letterSpacing: 1 }}>kcal</div>
                        </div>
                      </div>
                      {[
                        { l: "P", v: dt.protein_g, t: TARGETS.protein_g, c: "#38bdf8" },
                        { l: "C", v: dt.carbs_g, t: TARGETS.carbs_g, c: "#f97316" },
                        { l: "F", v: dt.fat_g, t: TARGETS.fat_g, c: "#facc15" },
                      ].map((m) => (
                        <div key={m.l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 9, ...mono, color: m.c, width: 8 }}>{m.l}</span>
                          <MiniBar val={m.v} max={m.t} color={m.c} />
                          <span style={{ fontSize: 9, ...mono, color: "#3a4e3a", width: 28, textAlign: "right" }}>{m.v}g</span>
                        </div>
                      ))}
                    </div>
                    {isOpen && (
                      <div style={{ background: "#0e130e", border: "1px solid #2a4a1a", borderTop: "none", borderRadius: "0 0 16px 16px", padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                          <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#4a6a4a", ...mono }}>Meal Breakdown</span>
                          <div style={{ display: "flex", gap: 8 }}>
                            <ExportBtn loading={expDay === day.date} bg="linear-gradient(135deg,#6db33f,#4a9a2a)" color="#0a1a08" onClick={() => handleExportDay(day.date, day)}>📄 Export Day</ExportBtn>
                            <button onClick={() => deleteDay(day.date)} style={{ background: "transparent", border: "1px solid #4a1a1a", borderRadius: 8, padding: "4px 12px", color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🗑 Delete</button>
                          </div>
                        </div>
                        {allSlots.map(({ key, label, emoji }) => (
                          <MealCard key={key} meal={day.meals?.[key]} mealKey={key} label={label} emoji={emoji} date={day.date} onEdit={() => setEditing({ date: day.date, mealKey: key, label })} />
                        ))}
                        <div style={{ background: "#111610", border: "1px solid #1c2a1c", borderRadius: 12, padding: "10px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>🔥 Workout</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {day.workout ? (
                                <>
                                  <span style={{ fontSize: 11, ...mono, color: "#f97316" }}>−{day.workout.calories_burnt} kcal</span>
                                  <EditBtn onClick={() => setEditing({ date: day.date, workout: true })} />
                                </>
                              ) : (
                                <span style={{ fontSize: 11, ...mono, color: "#2a3a2a" }}>—</span>
                              )}
                            </div>
                          </div>
                          {day.workout && <div style={{ marginTop: 6, fontSize: 10, color: "#8aaa8a", ...mono }}>{day.workout.activity} · {day.workout.duration_min} min</div>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

    </div>
  );
}
