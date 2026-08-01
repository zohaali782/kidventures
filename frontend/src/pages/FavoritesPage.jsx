import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FavoriteButton from "../components/FavoriteButton";
import { getFavorites } from "../api/favorites";

function FavoritesPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const sync = () => setItems(getFavorites());
    sync();
    window.addEventListener("kv-store", sync);
    return () => window.removeEventListener("kv-store", sync);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown [color-scheme:light]">
      <Helmet>
        <title>Saved Classes — Kidventures</title>
        <meta
          name="description"
          content="Your saved kids' activities and classes on Kidventures."
        />
      </Helmet>

      <Navbar />

      <section className="px-4 py-8 sm:px-6 md:px-10">
        <h1 className="mb-1.5 text-2xl font-bold text-brand-brown">
          Saved Classes
        </h1>
        <p className="mb-6 text-[13px] text-brand-brown/70">
          {items.length} {items.length === 1 ? "class" : "classes"} saved
        </p>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-brand-cream/50 px-6 py-14 text-center">
            <h3 className="mb-2 text-[17px] font-bold text-brand-brown">
              No saved classes yet
            </h3>
            <p className="mx-auto mb-5 max-w-md text-[13px] text-brand-brown/65">
              Tap the heart on any class to save it here for later.
            </p>
            <Link
              to="/activities"
              className="inline-block rounded-[10px] bg-brand-orange px-6 py-3 text-[13px] font-bold text-white no-underline"
            >
              Browse Activities
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <div
                key={a.id}
                className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(61,43,31,0.10)]"
              >
                <Link to={`/activity/${a.id}`} className="block no-underline">
                  <div className="relative h-[140px] w-full bg-brand-cream">
                    {a.image && (
                      <img
                        src={a.image}
                        alt={a.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                    <FavoriteButton
                      item={a}
                      className="absolute right-2.5 top-2.5"
                    />
                    {a.format && (
                      <span
                        className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${a.format === "online" ? "bg-brand-sky" : "bg-brand-orange"}`}
                      >
                        {a.format === "online" ? "Online" : "In-person"}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-bold text-brand-brown">
                      {a.title}
                    </div>
                    <div className="my-1 text-xs font-bold text-brand-gold">
                      ★ {a.rating} ({a.reviews})
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-brand-brown/70">
                        {a.ageGroup ? `Ages ${a.ageGroup}` : ""}
                      </span>
                      <span className="font-bold text-brand-brown">
                        {a.price !== "" ? `AED ${a.price}` : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

export default FavoritesPage;
