import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

/**
 * SEO: har page ka apna canonical URL.
 *
 * Pehle index.html me canonical HAMESHA "https://kidventures.ae/" tha —
 * yaani /activities, /activity/:id, /instructors waghera sab Google ko keh
 * rahe the "mera asli page homepage hai". Google phir in pages ko index hi
 * nahi karta. Ab har page apna khud ka address batata hai.
 */
const SITE = "https://kidventures.ae";

export default function CanonicalTag() {
  const { pathname } = useLocation();
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const url = `${SITE}${path}`;

  return (
    <Helmet>
      <link rel="canonical" href={url} />
      <meta property="og:url" content={url} />
    </Helmet>
  );
}
