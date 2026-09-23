// frontend/api/share-preview.js
//
// PROBLEM: WhatsApp/Facebook/Telegram/etc link-preview bots do NOT run
// JavaScript. They just fetch the raw HTML for whatever URL was shared.
// Because this is a React SPA, every route (including /activity/:id) is
// served the SAME static index.html (see vercel.json's catch-all rewrite),
// which only ever has Kidventures' generic title/description/logo. So no
// matter which instructor's class link you share, the preview always shows
// the same generic Kidventures card - never that class's own photo/title.
//
// FIX: vercel.json now sends bot traffic (matched by User-Agent) for
// /activity/:id to THIS function instead of the SPA. We fetch that one
// class from the backend and hand the bot a tiny HTML page whose
// og:/twitter: tags are that class's own title, description and photo.
// Real people (normal browser User-Agent) never hit this file - they still
// get routed to the real React app as before.
//
// SAFETY NET: some apps' in-app browsers (e.g. WhatsApp on Android) can
// send a UA that also matches our bot pattern when a PERSON taps the link.
// The <meta http-equiv="refresh"> below instantly bounces that case to the
// real, interactive class page - so a human never gets stuck on this stub.

const FALLBACK = {
  title: "Kidventures — Kids' Activities, Camps & Classes in the UAE",
  description:
    "Discover and book trusted kids' activities, camps, and classes across the UAE with Kidventures — where education meets imagination.",
  image: "https://kidventures.ae/apple-touch-icon.png",
};

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const truncate = (s = "", n) =>
  s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;

module.exports = async (req, res) => {
  const id = typeof req.query.id === "string" ? req.query.id : "";
  const pageUrl = `https://kidventures.ae/activity/${id}`;

  let title = FALLBACK.title;
  let description = FALLBACK.description;
  let image = FALLBACK.image;

  try {
    const apiUrl = (process.env.VITE_API_URL || "").replace(/\/+$/, "");
    if (id && apiUrl) {
      const r = await fetch(`${apiUrl}/activities/${id}`);
      if (r.ok) {
        const data = await r.json();
        const a = data && data.activity;
        if (a && a.title) {
          title = a.instructor?.name
            ? `${a.title} — by ${a.instructor.name} | Kidventures`
            : `${a.title} | Kidventures`;
          description = truncate(a.description || FALLBACK.description, 200);
          image = a.coverImage?.url || a.images?.[0]?.url || FALLBACK.image;
        }
      }
    }
  } catch (err) {
    console.error("[share-preview] lookup failed:", err.message);
    // Fall through to the generic Kidventures card - a working generic
    // preview is better than a broken page.
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Classes get edited/removed - don't let bots cache a stale preview.
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${esc(pageUrl)}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Kidventures" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(pageUrl)}" />
    <meta property="og:image" content="${esc(image)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(image)}" />

    <meta http-equiv="refresh" content="0; url=${esc(pageUrl)}" />
  </head>
  <body>
    <p>Redirecting to <a href="${esc(pageUrl)}">${esc(title)}</a>…</p>
  </body>
</html>`);
};
