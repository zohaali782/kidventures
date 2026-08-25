import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="mb-2.5 font-bold text-brand-gold">{title}</h4>
      <div className="flex flex-col gap-1.5">
        {links.map((l) => (
          <Link
            key={l.label}
            to={l.to}
            className="text-[13px] text-brand-cream no-underline hover:underline"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Social icons ------------------------------
 * Simple, recognizable brand glyphs — kept as inline SVGs (no icon library
 * dependency), filled with currentColor so they inherit the button's color.
 */
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
      <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.32 1.35 20.65.94 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0z" />
      <path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zM18.41 4.6a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}

function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
      <path d="M16.5 2c.25 1.7 1.27 3.13 2.73 3.9.9.48 1.9.72 2.94.72v3.14a7.6 7.6 0 0 1-4.44-1.42v6.5c0 3.6-2.9 6.5-6.5 6.5S4.73 17.44 4.73 13.84a6.5 6.5 0 0 1 7.65-6.4v3.24a3.26 3.26 0 1 0 2.3 3.12V2h1.82z" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.16-4.94-4.35-.14-.19-1.19-1.58-1.19-3.02 0-1.44.75-2.14 1.02-2.44.27-.29.58-.36.78-.36h.56c.18 0 .42-.03.65.5.24.55.81 1.9.88 2.04.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.13-.28.28-.12.55.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.11.6-.07.16-.18.68-.79.87-1.06.18-.27.36-.22.6-.13.24.09 1.55.73 1.81.86.26.13.44.19.5.3.06.11.06.62-.18 1.3z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

// Ye asal Kidventures account hain — kahin aur badalne ki zaroorat nahi.
const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/kidventures_official_/",
    Icon: InstagramIcon,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1QYvJY3Kp1/",
    Icon: FacebookIcon,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@kidventures_official",
    Icon: TiktokIcon,
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/971568376461",
    Icon: WhatsappIcon,
  },
  {
    label: "Email",
    href: "mailto:kidventuresevents@gmail.com",
    Icon: MailIcon,
  },
];

function Footer() {
  return (
    <footer className="bg-brand-brown px-6 py-10 text-brand-cream sm:px-10">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="max-w-[250px]">
          <img src={logo} alt="Kidventures" className="mb-2.5 h-[55px]" />
          <p className="text-[13px] opacity-80">
            Discover, learn, and grow with trusted instructors in Dubai.
          </p>

          {/* Social icons — chhote gol buttons, hover pe halka bright ho jate hain */}
          <div className="mt-4 flex gap-2.5">
            {socialLinks.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-cream/10 text-brand-cream transition-colors hover:bg-brand-gold hover:text-brand-brown"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
        <FooterCol
          title="Quick Links"
          links={[
            { label: "About", to: "/about" },
            { label: "How It Works", to: "/how-it-works" },
            { label: "Become an Instructor", to: "/become-instructor" },
            { label: "Contact", to: "/contact" },
          ]}
        />
        <FooterCol
          title="Support"
          links={[
            { label: "FAQs", to: "/faqs" },
            { label: "Privacy Policy", to: "/privacy-policy" },
            { label: "Terms & Conditions", to: "/terms" },
            { label: "Refund Policy", to: "/refund-policy" },
          ]}
        />
      </div>
      <div className="mx-auto mt-7.5 max-w-[1100px] border-t border-brand-cream/20 pt-5 text-center text-xs opacity-70">
        © 2026 Kidventures. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
