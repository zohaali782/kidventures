import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router SPA navigation par browser khud scroll position reset
 * nahi karta — agar user footer se koi link (About, How It Works waghera)
 * click kare jab wo pehle se neeche scroll ho, to naya page load ho jata
 * hai lekin scroll wahi neeche rehta hai. Isi wajah se lagta hai ke page
 * open hi nahi hua.
 *
 * Yeh component har route change (pathname badalte hi) par window ko
 * top par le jata hai — normal multi-page site jaisa behavior.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
