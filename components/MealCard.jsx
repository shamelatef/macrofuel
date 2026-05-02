import { mono } from "../utils";
import { EditBtn } from "./ui";

export default function MealCard({ meal, mealKey, label, emoji, date, onEdit }) {
  return (
    <div style={{ background: "#111610", border: "1px solid #1c221c", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: meal ? 6 : 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{emoji} {label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {meal ? (
            <>
              <span style={{ fontSize: 11, ...mono, color: "#a3e635" }}>{meal.total_calories} kcal</span>
              <EditBtn onClick={onEdit} />
            </>
          ) : (
            <span style={{ fontSize: 11, ...mono, color: "#2a3a2a" }}>—</span>
          )}
        </div>
      </div>
      {meal?.items?.length > 0 ? (
        meal.items.map((item, ii) => (
          <div key={ii} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: ii < meal.items.length - 1 ? "1px solid #1a241a" : "none", gap: 6 }}>
            <span style={{ fontSize: 10, color: "#c8d8c8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
            <div style={{ display: "flex", gap: 6, fontSize: 9, ...mono, flexShrink: 0 }}>
              <span style={{ color: "#38bdf8" }}>{item.protein_g}P</span>
              <span style={{ color: "#f97316" }}>{item.carbs_g}C</span>
              <span style={{ color: "#facc15" }}>{item.fat_g}F</span>
              <span style={{ color: "#4a6a4a" }}>{item.calories}</span>
            </div>
          </div>
        ))
      ) : (
        <div style={{ fontSize: 10, color: "#2a3a2a", fontStyle: "italic", ...mono }}>Nothing logged</div>
      )}
    </div>
  );
}
