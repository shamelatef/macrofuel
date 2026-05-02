export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function fmtDate(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function fmtShort(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
