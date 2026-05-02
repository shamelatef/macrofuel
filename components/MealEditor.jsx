import { useState } from "react";
import { recomputeMealTotals, mono } from "../utils";
import { analyzeMeal } from "../api/gemini";

function NumInput({ value, onChange, style }) {
  return (
    <input
      type="number"
      value={value}
      onChange={onChange}
      step="any"
      style={{ width: "100%", background: "#0e130e", border: "1px solid #2a3a2a", borderRadius: 6, padding: "4px 6px", color: "#dde8dd", fontSize: 11, ...mono, textAlign: "right", outline: "none", ...style }}
    />
  );
}

export default function MealEditor({ meal, label, onSave, onClose }) {
  const [items, setItems] = useState(meal?.items?.map((i) => ({ ...i })) || []);
  const [desc, setDesc] = useState(meal?.description || "");
  const [analyzing, setAnalyzing] = useState(false);

  function upd(idx, field, val) {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: field === "name" ? val : val === "" ? "" : +val } : it)));
  }
  function del(idx) {
    setItems((p) => p.filter((_, i) => i !== idx));
  }
  function add() {
    setItems((p) => [...p, { name: "", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }]);
  }
  async function reanalyze() {
    if (!desc.trim()) return;
    setAnalyzing(true);
    try {
      const r = await analyzeMeal(label, desc);
      setItems(r.items || []);
    } catch {
      // keep current items on failure
    }
    setAnalyzing(false);
  }
  function save() {
    const clean = items.filter((it) => it.name.trim());
    onSave({ ...meal, ...recomputeMealTotals(clean), items: clean, description: desc });
  }

  const tot = recomputeMealTotals(items);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#111610", border: "1px solid #2a4a1a", borderRadius: 20, padding: 20, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>✏️ Edit {label}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4a6a4a", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, background: "#0e130e", borderRadius: 12, padding: "10px 12px" }}>
          {[
            { l: "Kcal", v: tot.total_calories, c: "#a3e635" },
            { l: "Protein", v: tot.total_protein_g, c: "#38bdf8" },
            { l: "Carbs", v: tot.total_carbs_g, c: "#f97316" },
            { l: "Fat", v: tot.total_fat_g, c: "#facc15" },
          ].map((m) => (
            <div key={m.l} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 800, ...mono, color: m.c }}>{m.v}</div>
              <div style={{ fontSize: 9, color: "#4a6a4a", textTransform: "uppercase", letterSpacing: 1 }}>{m.l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={{ fontSize: 10, color: "#4a6a4a", ...mono }}>DESCRIPTION</label>
            <button onClick={reanalyze} disabled={analyzing || !desc.trim()} style={{ display: "flex", alignItems: "center", gap: 4, background: analyzing || !desc.trim() ? "#1c2a1c" : "linear-gradient(135deg,#6db33f,#4a9a2a)", color: analyzing || !desc.trim() ? "#3a5a3a" : "#0a1a08", border: "none", borderRadius: 8, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: analyzing || !desc.trim() ? "default" : "pointer", fontFamily: "inherit" }}>
              {analyzing ? "Analyzing…" : "🔄 Re-analyze"}
            </button>
          </div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Meal description…" style={{ width: "100%", background: "#0e130e", border: "1px solid #1c2a1c", borderRadius: 10, padding: "8px 10px", color: "#dde8dd", fontSize: 12, lineHeight: 1.5, minHeight: 48, resize: "vertical", fontFamily: "inherit", outline: "none" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px 60px 28px", gap: 4, marginBottom: 6 }}>
          {["Item", "Kcal", "Protein", "Carbs", "Fat", ""].map((h) => (
            <span key={h} style={{ fontSize: 9, color: "#3a5a3a", textTransform: "uppercase", ...mono, textAlign: h && h !== "Item" ? "center" : "left" }}>{h}</span>
          ))}
        </div>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px 60px 28px", gap: 4, marginBottom: 6, alignItems: "center" }}>
            <input value={item.name} onChange={(e) => upd(idx, "name", e.target.value)} placeholder="Item name" style={{ background: "#0e130e", border: "1px solid #1c2a1c", borderRadius: 8, padding: "5px 8px", color: "#dde8dd", fontSize: 11, fontFamily: "inherit", width: "100%", outline: "none" }} />
            <NumInput value={item.calories} onChange={(e) => upd(idx, "calories", e.target.value)} />
            <NumInput value={item.protein_g} onChange={(e) => upd(idx, "protein_g", e.target.value)} />
            <NumInput value={item.carbs_g} onChange={(e) => upd(idx, "carbs_g", e.target.value)} />
            <NumInput value={item.fat_g} onChange={(e) => upd(idx, "fat_g", e.target.value)} />
            <button onClick={() => del(idx)} style={{ background: "none", border: "none", color: "#6a2a2a", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, textAlign: "center" }}>✕</button>
          </div>
        ))}
        <button onClick={add} style={{ width: "100%", background: "transparent", border: "1px dashed #2a4a1a", borderRadius: 10, padding: 8, color: "#6db33f", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4, marginBottom: 16 }}>+ Add Item</button>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "#1c221c", border: "1px solid #2a3a2a", borderRadius: 10, padding: "9px 20px", color: "#4a6a4a", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={save} style={{ background: "linear-gradient(135deg,#6db33f,#4a9a2a)", border: "none", borderRadius: 10, padding: "9px 24px", color: "#0a1a08", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
        </div>
      </div>
    </div>
  );
}
