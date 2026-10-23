// frontend/api/sitemap-classes.js
//
// SEO: Google ke liye har CLASS aur har INSTRUCTOR ke page ka sitemap.
//
// public/sitemap.xml sirf fixed pages (home, about, faqs...) batata hai.
// Classes aur instructors database me hain aur roz badalte hain, is liye
// yeh function har dafa live API se list le kar sitemap banata hai.
// vercel.json /sitemap-classes.xml ko yahan bhejta hai, aur robots.txt
// Google ko dono sitemaps ka pata deta hai.
//
// ESM (export default) - frontend/package.json "type": "module" hai.

const SITE = "https://kidventures.ae";
const MAX_PAGES = 20; // 20 x 50 = 1000 tak - kaafi hai

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const day = (d) => {
  const t = d ? new Date(d) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toISOString().slice(0, 10) : "";
};

async function fetchAll(apiUrl, path, key) {
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await fetch(`${apiUrl}${path}?limit=50&page=${page}`);
    if (!r.ok) break;
    const data = await r.json();
    const items = (data && data[key]) || [];
    out.push(...items);
    if (!data.pages || page >= data.pages || items.length === 0) break;
  }
  return out;
}

export default async function handler(req, res) {
  const urls = [];
  try {
    const apiUrl = (process.env.VITE_API_URL || "").replace(/\/+$/, "");
    if (apiUrl) {
      const [activities, instructors] = await Promise.all([
        fetchAll(apiUrl, "/activities", "activities").catch(() => []),
        fetchAll(apiUrl, "/instructors", "instructors").catch(() => []),
      ]);

      for (const a of activities) {
        const id = a._id || a.id;
        if (!id) continue;
        urls.push({ loc: `${SITE}/activity/${id}`, lastmod: day(a.updatedAt), priority: "0.8" });
      }
      for (const p of instructors) {
        const id = p.user?._id || p.user?.id || p.user;
        if (!id || typeof id !== "string") continue;
        urls.push({ loc: `${SITE}/instructor/${id}`, lastmod: day(p.updatedAt), priority: "0.6" });
      }
    }
  } catch (err) {
    console.error("[sitemap-classes] failed:", err.message);
  }

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${esc(u.loc)}</loc>\n` +
        (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : "") +
        `    <changefreq>weekly</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n");

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
  res
    .status(200)
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    );
}
