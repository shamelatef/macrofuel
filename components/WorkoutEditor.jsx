import { useState } from "react";
import { FieldInput } from "./ui";

export default function WorkoutEditor({ workout, onSave, onClose }) {
  const [activity, setActivity] = useState(workout?.activity || "");
  const [duration, setDuration] = useState(workout?.duration_min || 0);
  const [calories, setCalories] = useState(workout?.calories_burnt || 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#111610", border: "1px solid #2a4a1a", borderRadius: 20, padding: 20, width: "100%", maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>✏️ Edit Workout</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4a6a4a", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        <FieldInput label="Activity" value={activity} onChange={(e) => setActivity(e.target.value)} />
        <FieldInput label="Duration (min)" value={duration} onChange={(e) => setDuration(e.target.value)} type="number" />
        <FieldInput label="Calories burnt" value={calories} onChange={(e) => setCalories(e.target.value)} type="number" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={onClose} style={{ background: "#1c221c", border: "1px solid #2a3a2a", borderRadius: 10, padding: "9px 20px", color: "#4a6a4a", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button
            onClick={() => onSave({ activity, duration_min: +duration, calories_burnt: +calories, description: `${activity} ${duration} min` })}
            style={{ background: "linear-gradient(135deg,#f97316,#ea6900)", border: "none", borderRadius: 10, padding: "9px 24px", color: "#0a1a08", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
