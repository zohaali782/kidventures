import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { getStoredUser, logout, homeForRole } from "../api/auth";
import { getUnreadCount } from "../api/messages";

const PinSmall = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F5941F"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

/**
 * UAE > Dubai > (Mirdif / Jumeirah / Arabian Ranches)
 *
 * Structure banayi hai taake aage aur emirates (jaise Sharjah) aur
 * unke areas asaani se add ho saken - bas LOCATION_GROUPS mein
 * naya { emirate, areas } object daalna hoga.
 *
 * Area select karte hi current page ke hisaab se navigate karta hai -
 * agar Instructors page par ho to instructors filter honge, warna
 * default Activities page par filtered results khulte hain. Dono
 * jagah wahi ?location= param use hota hai, is liye sidebar filters
 * ke saath bhi consistency rehti hai.
 */
const LOCATION_GROUPS = [
  { emirate: "Dubai", areas: ["Mirdif", "Jumeirah", "Arabian Ranches"] },
];

function NavLocation() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSelect = (area) => {
    setOpen(false);
    const base =
      location.pathname === "/instructors" ? "/instructors" : "/activities";
    navigate(`${base}?location=${encodeURIComponent(area)}`);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1.5"
      >
        <PinSmall />
        <span className="text-sm font-semibold text-brand-brown">UAE</span>
        <span className="text-[9px] text-brand-brown">▼</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-[999] mt-2.5 min-w-[190px] overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
            {LOCATION_GROUPS.map((group) => (
              <div key={group.emirate} className="mb-1 last:mb-0">
                <div className="px-3.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-brand-brown/50">
                  {group.emirate}
                </div>
                {group.areas.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => handleSelect(area)}
                    className="block w-full rounded-lg px-3.5 py-2.5 text-left text-[13px] font-medium text-brand-brown hover:bg-gray-100"
                  >
                    {area}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* round avatar — shows the user's photo if there is one, else their initial (brand gold/brown) */
function UserAvatar({ name, avatar, size = "h-9 w-9 text-sm" }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || "Account"}
        className={`${size} rounded-full object-cover`}
      />
    );
  }
  const initial = name ? name.trim().charAt(0).toUpperCase() : "U";
  return (
    <div
      className={`flex ${size} items-center justify-center rounded-full bg-brand-gold font-bold text-brand-brown`}
    >
      {initial}
    </div>
  );
}

const navLinks = [
  { to: "/activities", label: "Activities" },
  { to: "/instructors", label: "Instructors" },
  { to: "/camps", label: "Camps" },
  { to: "/how-it-works", label: "How It Works" },
];

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const close = () => setMenuOpen(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // Unread message badge — polled, not live, matches the rest of messaging.
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let alive = true;
    const check = async () => {
      try {
        const { data } = await getUnreadCount();
        if (alive) setUnread(data.count || 0);
      } catch {
        /* silent — badge just stays stale until next poll */
      }
    };
    check();
    const t = setInterval(check, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user]);

  const handleLogout = async () => {
    // logout ab server ko call karta hai taake httpOnly cookie clear ho —
    // JavaScript khud us cookie ko delete nahi kar sakti.
    await logout();
    setUser(null);
    setProfileOpen(false);
    close();
    navigate("/");
  };

  const showBecomeInstructor = user?.role !== "instructor";

  return (
    <nav className="sticky top-0 z-[100] border-b-2 border-brand-cream bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:gap-10 md:px-10">
        <Link to="/" className="flex-shrink-0" onClick={close}>
          <img src={logo} alt="Kidventures" className="h-14 w-auto md:h-16" />
        </Link>

        <div className="hidden flex-1 items-center gap-5 md:flex">
          <NavLocation />
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-semibold text-brand-brown no-underline hover:text-brand-orange"
            >
              {l.label}
            </Link>
          ))}
          {showBecomeInstructor && (
            <Link
              to="/become-instructor"
              className="text-sm font-semibold text-brand-orange no-underline"
            >
              Become an Instructor
            </Link>
          )}
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            to="/favorites"
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-brown no-underline"
          >
            <span className="text-base">♡</span>
            <span>Favorites</span>
          </Link>

          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center"
              >
                <UserAvatar name={user.name} avatar={user.avatar} />
              </button>
              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[998]"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-[999] mt-2.5 min-w-[190px] overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
                    <div className="mb-1 truncate border-b border-brand-cream px-3.5 py-2 text-[13px] font-bold text-brand-brown">
                      {user.name || "Account"}
                    </div>
                    <Link
                      to={homeForRole(user.role)}
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-lg px-3.5 py-2.5 text-left text-[13px] font-medium text-brand-brown no-underline hover:bg-gray-100"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/messages"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-[13px] font-medium text-brand-brown no-underline hover:bg-gray-100"
                    >
                      Messages
                      {unread > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-1.5 text-[10px] font-bold text-white">
                          {unread}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full rounded-lg px-3.5 py-2.5 text-left text-[13px] font-medium text-brand-brown hover:bg-gray-100"
                    >
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border-2 border-brand-sky bg-white px-4 py-1.5 text-[13px] font-semibold text-brand-sky no-underline"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-brand-gold px-4 py-1.5 text-[13px] font-bold text-brand-brown no-underline"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile right side */}
        <div className="flex items-center gap-3 md:hidden">
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center"
              >
                <UserAvatar
                  name={user.name}
                  avatar={user.avatar}
                  size="h-8 w-8 text-xs"
                />
              </button>
              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[998]"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-[999] mt-2.5 min-w-[180px] overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
                    <div className="mb-1 truncate border-b border-brand-cream px-3.5 py-2 text-[13px] font-bold text-brand-brown">
                      {user.name || "Account"}
                    </div>
                    <Link
                      to={homeForRole(user.role)}
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-lg px-3.5 py-2.5 text-left text-[13px] font-medium text-brand-brown no-underline hover:bg-gray-100"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/messages"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-[13px] font-medium text-brand-brown no-underline hover:bg-gray-100"
                    >
                      Messages
                      {unread > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-1.5 text-[10px] font-bold text-white">
                          {unread}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full rounded-lg px-3.5 py-2.5 text-left text-[13px] font-medium text-brand-brown hover:bg-gray-100"
                    >
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border-2 border-brand-sky bg-white px-3 py-1 text-xs font-semibold text-brand-sky no-underline"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-brand-brown no-underline"
              >
                Sign Up
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-brown hover:bg-brand-cream/60"
          >
            {menuOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-brand-cream bg-white px-4 py-3 md:hidden">
          <div className="mb-2">
            <NavLocation />
          </div>
          <div className="flex flex-col gap-0.5">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={close}
                className="rounded-lg px-2 py-2.5 text-sm font-semibold text-brand-brown no-underline hover:bg-brand-cream/50"
              >
                {l.label}
              </Link>
            ))}
            {showBecomeInstructor && (
              <Link
                to="/become-instructor"
                onClick={close}
                className="rounded-lg px-2 py-2.5 text-sm font-semibold text-brand-orange no-underline hover:bg-brand-cream/50"
              >
                Become an Instructor
              </Link>
            )}
            <Link
              to="/favorites"
              onClick={close}
              className="rounded-lg px-2 py-2.5 text-sm font-semibold text-brand-brown no-underline hover:bg-brand-cream/50"
            >
              ♡ Favorites
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
