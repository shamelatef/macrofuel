export const API_KEY = import.meta.env.VITE_API_KEY || "";
export const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || ""; // <-- Get free key at https://aistudio.google.com/apikey
export const PROJECT = "macro-fuel";
export const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
export const AUTH = `https://identitytoolkit.googleapis.com/v1/accounts`;
