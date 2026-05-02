import { useState } from "react";
import { signUp, signIn, sendReset } from "../api/auth";
import { FieldInput, Spinner } from "./ui";
import { mono } from "../utils";

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: true });

  async function submit() {
    if (!email.trim()) {
      setMsg({ text: "Please enter your email.", ok: false });
      return;
    }
    setLoading(true);
    setMsg({ text: "", ok: true });
    try {
      if (mode === "reset") {
        await sendReset(email);
        setMsg({ text: "Password reset email sent! Check your inbox.", ok: true });
        setMode("signin");
      } else if (mode === "signup") {
        const d = await signUp(email, pass);
        onAuth({ idToken: d.idToken, uid: d.localId, email: d.email });
      } else {
        const d = await signIn(email, pass);
        onAuth({ idToken: d.idToken, uid: d.localId, email: d.email });
      }
    } catch (e) {
      setMsg({ text: e.message, ok: false });
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0d0b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#dde8dd", margin: "0 0 6px" }}>
          Macro<span style={{ color: "#6db33f" }}>Fuel</span>
        </h1>
        <p style={{ color: "#4a6a4a", fontSize: 12, ...mono }}>78kg · Hyrox · Swim · Build Muscle</p>
      </div>
      <div style={{ background: "#111610", border: "1px solid #1c221c", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#dde8dd", marginBottom: 20, textAlign: "center" }}>
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
        </h2>
        <FieldInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        {mode !== "reset" && <FieldInput label="Password" value={pass} onChange={(e) => setPass(e.target.value)} type="password" />}
        {msg.text && (
          <div style={{ marginBottom: 12, fontSize: 11, color: msg.ok ? "#a3e635" : "#f87171", background: msg.ok ? "#1a3a1a" : "#2a1010", borderRadius: 8, padding: "8px 12px" }}>{msg.text}</div>
        )}
        <button
          onClick={submit}
          disabled={loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: loading ? "#1c2a1c" : "linear-gradient(135deg,#6db33f,#4a9a2a)",
            color: loading ? "#3a5a3a" : "#0a1a08",
            border: "none",
            borderRadius: 12,
            padding: "13px 20px",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {loading ? (
            <>
              <Spinner color="#3a5a3a" />
              Working…
            </>
          ) : mode === "signin" ? (
            "Sign In"
          ) : mode === "signup" ? (
            "Create Account"
          ) : (
            "Send Reset Email"
          )}
        </button>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          {mode === "signin" && (
            <>
              <button onClick={() => { setMode("signup"); setMsg({ text: "", ok: true }); }} style={{ background: "none", border: "none", color: "#6db33f", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Don't have an account? Sign up</button>
              <button onClick={() => { setMode("reset"); setMsg({ text: "", ok: true }); }} style={{ background: "none", border: "none", color: "#4a6a4a", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Forgot password?</button>
            </>
          )}
          {mode !== "signin" && (
            <button onClick={() => { setMode("signin"); setMsg({ text: "", ok: true }); }} style={{ background: "none", border: "none", color: "#6db33f", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Back to sign in</button>
          )}
        </div>
        <p style={{ marginTop: 16, fontSize: 10, color: "#2a3a2a", lineHeight: 1.6, ...mono, textAlign: "center" }}>🔐 Data stored in Firebase — accessible from any browser or device.</p>
      </div>
    </div>
  );
}
