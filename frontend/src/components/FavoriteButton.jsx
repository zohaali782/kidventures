import { useState, useEffect } from "react";
import { isFavorite, toggleFavorite } from "../api/favorites";

export default function FavoriteButton({
  item,
  withLabel = false,
  className = "",
}) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    const sync = () => setFav(isFavorite(item?.id));
    sync();
    window.addEventListener("kv-store", sync);
    return () => window.removeEventListener("kv-store", sync);
  }, [item?.id]);

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (item?.id) toggleFavorite(item);
  };

  const heart = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={fav ? "#F5941F" : "none"}
      stroke={fav ? "#F5941F" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );

  if (withLabel) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={fav}
        className={`flex items-center gap-2 rounded-[10px] border-2 px-4 py-2 text-[13px] font-bold ${
          fav
            ? "border-brand-orange text-brand-orange"
            : "border-gray-200 text-brand-brown"
        } ${className}`}
      >
        {heart} {fav ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={fav}
      aria-label={fav ? "Remove from favorites" : "Save to favorites"}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-brown shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${className}`}
    >
      {heart}
    </button>
  );
}
