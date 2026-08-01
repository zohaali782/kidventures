// src/api/favorites.js
// Favorites (wishlist) + recently-viewed — abhi localStorage me, baad me backend se
// sync kar sakte hain. "kv-store" event se saare components live update hote hain.

const FAV_KEY = "kv_favorites";
const RECENT_KEY = "kv_recent";

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k)) || [];
  } catch {
    return [];
  }
};
const write = (k, v) => {
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new Event("kv-store"));
};

/* ---- favorites ---- */
export const getFavorites = () => read(FAV_KEY);
export const isFavorite = (id) => read(FAV_KEY).some((x) => x.id === id);
export const toggleFavorite = (item) => {
  const list = read(FAV_KEY);
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list.splice(i, 1);
  else list.unshift({ ...item, savedAt: Date.now() });
  write(FAV_KEY, list);
  return i < 0; // true = ab favorited hai
};
export const removeFavorite = (id) => {
  write(
    FAV_KEY,
    read(FAV_KEY).filter((x) => x.id !== id),
  );
};

/* ---- recently viewed ---- */
export const getRecentlyViewed = () => read(RECENT_KEY);
export const addRecentlyViewed = (item) => {
  if (!item?.id) return;
  const list = read(RECENT_KEY).filter((x) => x.id !== item.id);
  list.unshift({ ...item, viewedAt: Date.now() });
  write(RECENT_KEY, list.slice(0, 8));
};
