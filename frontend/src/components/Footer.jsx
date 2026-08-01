import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

const colors = { gold: "#F4C542", cream: "#FBEDDE", brown: "#3D2B1F" };

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 style={{ color: colors.gold, marginBottom: "10px" }}>{title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {links.map((l) => (
          <a
            key={l}
            href="#"
            style={{
              color: colors.cream,
              textDecoration: "none",
              fontSize: "13px",
            }}
          >
            {l}
          </a>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer
      style={{
        backgroundColor: colors.brown,
        color: colors.cream,
        padding: "40px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "30px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div style={{ maxWidth: "250px" }}>
          <img
            src={logo}
            alt="Kidventures"
            style={{ height: "55px", marginBottom: "10px" }}
          />
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            Discover, learn, and grow with trusted instructors in Dubai.
          </p>
        </div>
        <FooterCol
          title="Quick Links"
          links={["About", "How It Works", "Become an Instructor", "Contact"]}
        />
        <FooterCol
          title="Support"
          links={["FAQs", "Privacy Policy", "Terms & Conditions"]}
        />
      </div>
      <div
        style={{
          textAlign: "center",
          marginTop: "30px",
          paddingTop: "20px",
          borderTop: "1px solid rgba(251,237,222,0.2)",
          fontSize: "12px",
          opacity: 0.7,
        }}
      >
        © 2026 Kidventures. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
