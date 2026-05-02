export const TARGETS = { calories: 3500, protein_g: 156, carbs_g: 480, fat_g: 97 };
export const BASE_SLOTS = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "☀️" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
];
export const CIRC = 2 * Math.PI * 74;
export const mono = { fontFamily: "monospace" };

export function calcTotals(meals = {}) {
  return Object.values(meals).reduce(
    (a, m) => ({
      calories: +(a.calories + (m.total_calories || 0)).toFixed(1),
      protein_g: +(a.protein_g + (m.total_protein_g || 0)).toFixed(1),
      carbs_g: +(a.carbs_g + (m.total_carbs_g || 0)).toFixed(1),
      fat_g: +(a.fat_g + (m.total_fat_g || 0)).toFixed(1),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

export function recomputeMealTotals(items) {
  return {
    total_calories: +items.reduce((s, i) => s + (+i.calories || 0), 0).toFixed(1),
    total_protein_g: +items.reduce((s, i) => s + (+i.protein_g || 0), 0).toFixed(1),
    total_carbs_g: +items.reduce((s, i) => s + (+i.carbs_g || 0), 0).toFixed(1),
    total_fat_g: +items.reduce((s, i) => s + (+i.fat_g || 0), 0).toFixed(1),
  };
}

export function exportHTMLReport(title, report, subtitle = "") {
  const body = report
    .split("\n")
    .map((l) => {
      l = l.trim();
      if (!l) return "<br/>";
      if (/^[A-Z][A-Z\s\/]{3,}$/.test(l)) return `<h2>${l}</h2>`;
      if (l.match(/^[-•]/)) return `<ul><li>${l.replace(/^[-•]\s*/, "")}</li></ul>`;
      return `<p>${l}</p>`;
    })
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:48px;max-width:800px;margin:0 auto;line-height:1.7}.bar{height:5px;background:#4a9a2a;margin:-48px -48px 32px}.logo{font-size:24px;font-weight:900}.logo span{color:#4a9a2a}.title{font-size:18px;font-weight:700;margin:10px 0 4px}.sub{font-size:10px;color:#888;margin-bottom:24px}hr{border:none;border-top:1px solid #ddd;margin:16px 0}h2{font-size:10px;font-weight:700;color:#3a8a18;text-transform:uppercase;letter-spacing:1.5px;background:#f2faea;padding:5px 10px;border-radius:4px;margin:22px 0 10px}p{color:#444;margin-bottom:7px}ul{padding-left:18px}li{color:#444;margin-bottom:5px}.footer{margin-top:48px;border-top:1px solid #eee;padding-top:12px;font-size:10px;color:#bbb;display:flex;justify-content:space-between}</style></head><body><div class="bar"></div><div class="logo">Macro<span>Fuel</span></div><hr/><div class="title">${title}</div>${subtitle ? `<div class="sub">${subtitle}</div>` : ""}${body}<div class="footer"><span>MacroFuel</span><span>${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div></body></html>`;
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([html], { type: "text/html" })),
    download: title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_").slice(0, 60) + ".html",
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

