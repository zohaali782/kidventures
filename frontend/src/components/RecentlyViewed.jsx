import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getRecentlyViewed } from "../api/favorites";

export default function RecentlyViewed() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const sync = () => setItems(getRecentlyViewed());
    sync();
    window.addEventListener("kv-store", sync);
    return () => window.removeEventListener("kv-store", sync);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="px-4 py-10 sm:px-6 md:px-10">
      <h2 className="mb-5 text-xl font-bold text-brand-brown sm:text-2xl">
        Recently viewed
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {items.map((a) => (
          <Link
            key={a.id}
            to={`/activity/${a.id}`}
            className="block w-[200px] flex-shrink-0 overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(61,43,31,0.10)] no-underline"
          >
            <div className="h-[110px] w-full bg-brand-cream">
              {a.image && (
                <img
                  src={a.image}
                  alt={a.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="p-3">
              <div className="line-clamp-1 text-sm font-bold text-brand-brown">
                {a.title}
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span className="font-bold text-brand-gold">★ {a.rating}</span>
                <span className="font-bold text-brand-brown">
                  {a.price !== "" ? `AED ${a.price}` : ""}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
