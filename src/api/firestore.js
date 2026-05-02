import { FS } from '../config';

function toFS(obj) {
  function cv(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === "boolean") return { booleanValue: v };
    if (typeof v === "number") return { doubleValue: v };
    if (typeof v === "string") return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(cv) } };
    if (typeof v === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cv(x)])) } };
    return { stringValue: String(v) };
  }
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, cv(v)]));
}

function fromFS(fields = {}) {
  function pv(v) {
    if ("nullValue" in v) return null;
    if ("booleanValue" in v) return v.booleanValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return v.doubleValue;
    if ("stringValue" in v) return v.stringValue;
    if ("arrayValue" in v) return (v.arrayValue.values || []).map(pv);
    if ("mapValue" in v) return fromFS(v.mapValue.fields || {});
    return null;
  }
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, pv(v)]));
}

export async function fsGet(path, token) {
  const r = await fetch(`${FS}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  const d = await r.json();
  return d.fields ? fromFS(d.fields) : null;
}

export async function fsSet(path, data, token) {
  const r = await fetch(`${FS}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: toFS(data) }),
  });
  if (!r.ok) {
    const e = await r.json();
    throw new Error(e.error?.message || "Save failed");
  }
}

export async function fsList(path, token) {
  const r = await fetch(`${FS}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json();
  if (!d.documents) return [];
  return d.documents
    .map((doc) => ({ date: doc.name.split("/").pop(), ...fromFS(doc.fields) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function fsDelete(path, token) {
  await fetch(`${FS}/${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}
