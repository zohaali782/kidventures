/**
 * URL ki jaanch — ek hi jagah, taake har controller apna alag tareeqa na banaye.
 *
 * Masla: video links instructor likhta hai aur frontend unhe embed ya link
 * karta hai. Bina jaanch ke "javascript:alert(...)" ya kisi bhi bahri site ka
 * link daala ja sakta hai. "https://youtube.com.evil.com" jaisa naam bhi
 * dhoka de sakta hai, is liye hostname ka poora match karte hain — "shamil
 * hai ya nahi" wala check kaafi nahi.
 */

const VIDEO_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
];

/**
 * Sirf https YouTube/Vimeo links qabool.
 *
 * @returns {string|null} saaf URL, "" agar khali kiya ja raha ho,
 *                        ya null agar qabool nahi
 */
const cleanVideoUrl = (value) => {
  if (value === null || value === undefined || value === "") return "";

  let parsed;
  try {
    parsed = new URL(String(value).trim());
  } catch {
    return null; // URL banta hi nahi
  }

  if (parsed.protocol !== "https:") return null;

  // Poora hostname match — "youtube.com.evil.com" pass nahi hoga
  if (!VIDEO_HOSTS.includes(parsed.hostname.toLowerCase())) return null;

  return parsed.toString();
};

/**
 * Aam https link (social profiles waghera) — koi bhi domain, magar
 * protocol sirf https. "javascript:" aur "data:" band.
 */
const cleanHttpsUrl = (value) => {
  if (value === null || value === undefined || value === "") return "";

  let parsed;
  try {
    parsed = new URL(String(value).trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;

  return parsed.toString();
};

module.exports = { VIDEO_HOSTS, cleanVideoUrl, cleanHttpsUrl };
