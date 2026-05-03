import { AUTH, API_KEY } from '../config';

async function authReq(endpoint, body) {
  if (!API_KEY) {
    // Demo mode - return mock user data
    if (endpoint === "signUp" || endpoint === "signInWithPassword") {
      return {
        idToken: "demo-token",
        localId: "demo-user",
        email: body.email
      };
    }
    return {};
  }
  const r = await fetch(`${AUTH}:${endpoint}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, returnSecureToken: true }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message.replace(/_/g, " ").toLowerCase());
  return d;
}

export const signUp = (e, p) => authReq("signUp", { email: e, password: p });
export const signIn = (e, p) => authReq("signInWithPassword", { email: e, password: p });
export const sendReset = (e) => authReq("sendOobCode", { requestType: "PASSWORD_RESET", email: e });
