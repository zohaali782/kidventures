/**
 * NoSQL injection se bachao.
 *
 * Masla: agar koi request me aisa bhej de —
 *   { "email": { "$gt": "" }, "password": { "$gt": "" } }
 * to Mongo ke liye iska matlab hai "koi bhi email, koi bhi password",
 * aur galat handling me login bypass ho sakta hai. Isi tarah URL me
 * ?price[$gt]=0 filters ko cheer sakta hai.
 *
 * Hal: user ki bheji hui har cheez (body + query) me se woh keys nikaal
 * dete hain jo "$" se shuru hoti hain ya jin me "." hai — yehi keys Mongo
 * ke operators aur nested-path tricks banati hain. Normal data (strings,
 * numbers, arrays, nested objects) jyun ka tyun rehta hai.
 *
 * NOTE: mongoose.set("sanitizeFilter", true) is kaam ke liye ISTEMAL NAHI
 * kar sakte — woh HAR query par lagta hai, hamare apne code ke jaiz
 * operators ({ reservationExpiresAt: { $lt: now } }) par bhi, aur unhe
 * tor deta hai. Sanitization request ki boundary par honi chahiye.
 */

const MAX_DEPTH = 12;

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);

/**
 * Object/array ki nayi (saaf) copy banata hai.
 * dropped array me un keys ke naam jama karta hai jo hatai gayin.
 */
function clean(value, dropped, depth = 0) {
  if (depth > MAX_DEPTH) return undefined;

  if (Array.isArray(value)) {
    return value.map((v) => clean(v, dropped, depth + 1));
  }

  if (!isPlainObject(value)) return value;

  const out = {};
  for (const key of Object.keys(value)) {
    // "$gt", "$where", "$ne" ... aur "user.role" jaisi dotted paths
    if (key.startsWith("$") || key.includes(".")) {
      dropped.push(key);
      continue;
    }
    // prototype pollution
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      dropped.push(key);
      continue;
    }
    out[key] = clean(value[key], dropped, depth + 1);
  }
  return out;
}

const sanitizeRequest = (req, res, next) => {
  const dropped = [];

  if (req.body && typeof req.body === "object") {
    req.body = clean(req.body, dropped);
  }

  /**
   * Express 5 me req.query ek getter hai — usse seedha assign nahi kar sakte
   * (isi wajah se express-mongo-sanitize Express 5 par crash karta hai).
   * Is liye request object par apni property define kar dete hain.
   */
  if (req.query && typeof req.query === "object") {
    const cleanedQuery = clean(req.query, dropped);
    Object.defineProperty(req, "query", {
      value: cleanedQuery,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  if (dropped.length > 0) {
    console.warn(
      `[sanitize] ${req.method} ${req.originalUrl} — dropped keys: ${dropped.join(", ")}`,
    );
  }

  next();
};

module.exports = sanitizeRequest;
