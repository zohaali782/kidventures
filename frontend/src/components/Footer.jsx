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

function Footer() {
  return (
    <footer className="bg-brand-brown px-6 py-10 text-brand-cream sm:px-10">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="max-w-[250px]">
          <img src={logo} alt="Kidventures" className="mb-2.5 h-[55px]" />
          <p className="text-[13px] opacity-80">
            Discover, learn, and grow with trusted instructors in Dubai.
          </p>
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
