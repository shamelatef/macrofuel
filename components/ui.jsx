import { mono } from '../utils';

export function MiniBar({ val, max, color }) {
  return (
    <div style={{ flex: 1, height: 5, background: "#1a241a", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${Math.min((val || 0) / (max || 1), 1) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width .6s ease" }} />
    </div>
  );
}

export function MacroBar({ label, val, target, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#8aaa8a" }}>{label}</span>
        <span style={{ fontSize: 11, ...mono, color }}>
          {val}
          <span style={{ color: "#3a4e3a" }}>/{target}{label === "Calories" ? "" : "g"}</span>
        </span>
      </div>
      <MiniBar val={val} max={target} color={color} />
    </div>
  );
}

export function Spinner({ color = "#0a1a08" }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: type === "error" ? "#4a1a1a" : "#1a3a1a",
        border: `1px solid ${type === "error" ? "#8a2a2a" : "#2a6a2a"}`,
        color: type === "error" ? "#f87171" : "#a3e635",
        borderRadius: 12,
        padding: "10px 20px",
        fontSize: 12,
        fontWeight: 700,
        zIndex: 9999,
        whiteSpace: "nowrap",
        boxShadow: "0 4px 20px #00000060",
      }}
    >
      {msg}
    </div>
  );
}

export function FieldInput({ label, value, onChange, type = "text" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: "#4a6a4a", display: "block", marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        style={{ width: "100%", background: "#0e130e", border: "1px solid #2a3a2a", borderRadius: 10, padding: "9px 12px", color: "#dde8dd", fontSize: 13, fontFamily: "inherit", outline: "none" }}
      />
    </div>
  );
}

export function NInput({ value, onChange }) {
  return (
    <input
      type="number"
      value={value}
      onChange={onChange}
      style={{ width: 52, background: "#0e130e", border: "1px solid #2a3a2a", borderRadius: 6, padding: "3px 6px", color: "#dde8dd", fontSize: 11, ...mono, textAlign: "right", outline: "none" }}
    />
  );
}

export function EditBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "1px solid #2a4a1a", borderRadius: 8, padding: "3px 10px", color: "#6db33f", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
    >
      ✏️ Edit
    </button>
  );
}

export function LogBtn({ loading: ld, disabled: dis, bg, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={ld || dis}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        background: ld || dis ? "#1c2a1c" : bg,
        color: ld || dis ? "#3a5a3a" : "#0a1a08",
        border: "none",
        borderRadius: 10,
        padding: "0 14px",
        fontSize: 12,
        fontWeight: 700,
        cursor: ld || dis ? "default" : "pointer",
        flexShrink: 0,
        fontFamily: "inherit",
        minWidth: 52,
      }}
    >
      {ld ? <Spinner /> : children}
    </button>
  );
}

export function ExportBtn({ loading: ld, bg, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={ld}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: ld ? "#1c2a1c" : bg,
        color: ld ? "#3a5a3a" : color,
        border: "none",
        borderRadius: 10,
        padding: "9px 16px",
        fontSize: 11,
        fontWeight: 700,
        cursor: ld ? "default" : "pointer",
        fontFamily: "inherit",
      }}
    >
      {ld ? (
        <>
          <Spinner color="#3a5a3a" />
          Generating…
        </>
      ) : (
        children
      )}
    </button>
  );
}
