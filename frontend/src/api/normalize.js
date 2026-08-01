// src/api/normalize.js
// Backend ka data screen pe dikhane se pehle SAFE banane ke helpers.
// (agar kisi field ka naam alag ho to yahan ek jagah adjust karo.)

export const toList = (d) =>
  Array.isArray(d)
    ? d
    : d?.activities ||
      d?.instructors ||
      d?.categories ||
      d?.data ||
      d?.results ||
      [];

export const asText = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object")
    return v.name || v.label || v.title || v.area || v.city || "";
  return "";
};

export const pickLocation = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object")
    return v.area || v.city || v.name || v.label || v.address || "";
  return "";
};

export const pickImg = (...vals) => {
  for (const v of vals) {
    if (!v) continue;
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      if (v.url) return v.url;
      if (v.secure_url) return v.secure_url;
    }
  }
  return null;
};

export const asNum = (v) => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object")
    return Number(v.average ?? v.value ?? v.count ?? 0) || 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

export const fmtDate = (v) => {
  if (!v) return "";
  const dt = new Date(v);
  return isNaN(dt)
    ? ""
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

// agli aane wali session dhoondo (nextSession virtual ya sessions[] se)
const upcomingSession = (a) => {
  if (a.nextSession) return a.nextSession;
  if (Array.isArray(a.sessions) && a.sessions.length) {
    const now = new Date();
    const future = a.sessions
      .filter((s) => s?.date && new Date(s.date) >= now)
      .sort((x, y) => new Date(x.date) - new Date(y.date));
    return future[0] || a.sessions[0];
  }
  return null;
};

export const normActivity = (a) => {
  const s = upcomingSession(a);
  return {
    id: a._id || a.id,
    title: asText(a.title) || asText(a.name) || "Activity",
    instructor: asText(a.instructor?.name) || asText(a.instructor),
    category: asText(a.category?.name) || asText(a.category),
    ageGroup:
      a.ageGroup ||
      (a.ageMin != null && a.ageMax != null ? `${a.ageMin}-${a.ageMax}` : ""),
    date: s?.date ? fmtDate(s.date) : fmtDate(a.date),
    time: s?.startTime || s?.time || a.time || "",
    location:
      pickLocation(a.location) ||
      pickLocation(a.area) ||
      (a.format === "online" || a.isOnline ? "Online" : ""),
    format: a.format || (a.isOnline ? "online" : ""),
    // parent-facing price = displayPrice (commission-inclusive)
    price: a.displayPrice ?? a.price ?? "",
    rating: asNum(a.rating?.average ?? a.rating),
    reviews: asNum(a.rating?.count ?? a.reviews ?? a.reviewCount),
    image: pickImg(a.images?.[0], a.coverImage, a.image),
  };
};

export const normInstructor = (i) => ({
  id: i._id || i.id || i.user?._id,
  name:
    asText(i.name) ||
    asText(i.displayName) ||
    asText(i.user?.name) ||
    "Instructor",
  subject: asText(i.headline) || asText(i.categories?.[0]) || asText(i.subject),
  rating: asNum(i.rating?.average ?? i.rating),
  reviews: asNum(i.rating?.count ?? i.reviews ?? i.reviewCount),
  experience: asText(i.experienceYears ?? i.experience),
  location: pickLocation(i.location) || pickLocation(i.user?.city),
  photo: pickImg(i.user?.avatar, i.avatar, i.photo),
});
