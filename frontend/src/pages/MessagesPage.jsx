import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getStoredUser } from "../api/auth";
import {
  getConversations,
  getThread,
  sendMessage as sendMessageApi,
} from "../api/messages";

const POLL_MS = 15000;

/**
 * Personal info (phone number / email) chat mein type ho rahi ho to detect
 * karta hai — taake parents aur instructors ko yaad dilaya ja sake ke sab
 * communication aur booking Kidventures ke andar hi rahe (safety + platform
 * protection dono). Jab tak yeh detect hoti hai, Send button disabled rehta
 * hai aur "Send" try karne par bhi bheja nahi jata — draft delete nahi hota,
 * bas number/email hataye baghair message nahi jayega.
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN = /(\+?\d[\d\s\-().]{5,}\d)/;
function containsPersonalInfo(text) {
  if (!text) return false;
  if (EMAIL_PATTERN.test(text)) return true;
  const phoneMatch = text.match(PHONE_PATTERN);
  if (phoneMatch) {
    const digitCount = (phoneMatch[0].match(/\d/g) || []).length;
    if (digitCount >= 7) return true;
  }
  return false;
}

const cldOptimize = (url, width = 80) => {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com"))
    return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
};

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ name, avatar, size = "h-11 w-11 text-sm" }) {
  const url = avatar?.url || avatar;
  if (url) {
    return (
      <img
        src={cldOptimize(url)}
        alt=""
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    );
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-brand-gold font-bold text-brand-brown`}
    >
      {initial}
    </div>
  );
}

const SendIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export default function MessagesPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const me = getStoredUser();
  const myId = me?._id || me?.id;

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await getConversations();
      setConversations(data.conversations || []);
    } catch {
      /* silent — list will just retry on next poll */
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadThread = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const { data } = await getThread(uid);
      setMessages(data.messages || []);
      setOtherUser(data.otherUser || null);
      setError("");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Couldn't load this conversation.",
      );
    } finally {
      setLoadingThread(false);
    }
  }, []);

  // initial load + poll
  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, POLL_MS);
    return () => clearInterval(t);
  }, [loadConversations]);

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setOtherUser(null);
      return;
    }
    setLoadingThread(true);
    loadThread(userId);
    const t = setInterval(() => loadThread(userId), POLL_MS);
    return () => clearInterval(t);
  }, [userId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !userId || sending) return;
    if (containsPersonalInfo(text)) {
      setError(
        "This message wasn't sent because it looks like it contains a phone number or email address. Please remove it and try again.",
      );
      return;
    }
    setSending(true);
    setError("");
    try {
      await sendMessageApi(userId, text);
      setDraft("");
      await loadThread(userId);
      loadConversations();
    } catch (err) {
      setError(err?.response?.data?.message || "Message couldn't be sent.");
    } finally {
      setSending(false);
    }
  };

  const activeConvo =
    conversations.find((c) => c.userId === userId) ||
    (otherUser ? { userId, name: otherUser.name, avatar: otherUser.avatar } : null);

  const draftHasPersonalInfo = containsPersonalInfo(draft);

  return (
    <div className="min-h-screen bg-[#F7F5F2]">
      <Helmet>
        <title>Messages — Kidventures</title>
      </Helmet>
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold text-brand-brown">Messages</h1>

        <div className="flex min-h-[65vh] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Conversation list */}
          <div
            className={`w-full shrink-0 border-r border-gray-100 sm:w-[300px] ${
              userId ? "hidden sm:block" : "block"
            }`}
          >
            {loadingList ? (
              <div className="p-5 text-sm text-brand-brown/50">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="p-5 text-sm text-brand-brown/60">
                No conversations yet. Message an instructor from their
                profile to start one.
              </div>
            ) : (
              <div className="flex flex-col">
                {conversations.map((c) => (
                  <button
                    key={c.userId}
                    onClick={() => navigate(`/messages/${c.userId}`)}
                    className={`flex items-center gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 ${
                      c.userId === userId ? "bg-brand-cream/40" : ""
                    }`}
                  >
                    <Avatar name={c.name} avatar={c.avatar} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-bold text-brand-brown">
                          {c.name || "User"}
                        </span>
                        <span className="shrink-0 text-[11px] text-brand-brown/45">
                          {timeAgo(c.lastAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-brand-brown/60">
                          {c.lastMessage}
                        </span>
                        {c.unreadCount > 0 && (
                          <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-orange px-1.5 text-[10px] font-bold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active thread */}
          <div className={`flex min-w-0 flex-1 flex-col ${userId ? "flex" : "hidden sm:flex"}`}>
            {!userId ? (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-brand-brown/50">
                Select a conversation to view messages.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                  <button
                    onClick={() => navigate("/messages")}
                    className="text-brand-brown/70 sm:hidden"
                    aria-label="Back to conversations"
                  >
                    <BackIcon />
                  </button>
                  <Avatar
                    name={activeConvo?.name}
                    avatar={activeConvo?.avatar}
                    size="h-8 w-8 text-xs"
                  />
                  <span className="text-sm font-bold text-brand-brown">
                    {activeConvo?.name || "…"}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {loadingThread ? (
                    <div className="text-sm text-brand-brown/50">Loading…</div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-brand-brown/50">
                      No messages yet — say hello!
                    </div>
                  ) : (
                    messages.map((m) => {
                      const mine = (m.sender?._id || m.sender) === myId;
                      return (
                        <div
                          key={m._id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                              mine
                                ? "bg-brand-orange text-white"
                                : "bg-gray-100 text-brand-brown"
                            }`}
                          >
                            {m.body}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {error && (
                  <div className="px-4 pb-1 text-xs text-[#c0392b]">{error}</div>
                )}

                {draftHasPersonalInfo && (
                  <div className="mx-3 mb-2 rounded-lg bg-[#c0392b]/10 px-3 py-2 text-[12px] font-semibold text-[#c0392b]">
                    This looks like a phone number or email address. For your
                    safety, please remove it — sending is blocked until you
                    do. Keep all communication and bookings on Kidventures.
                  </div>
                )}

                <form
                  onSubmit={handleSend}
                  className="flex items-center gap-2 border-t border-gray-100 p-3"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message…"
                    maxLength={2000}
                    className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-brand-orange"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim() || draftHasPersonalInfo}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white disabled:opacity-50"
                    aria-label="Send"
                  >
                    <SendIcon />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-brand-brown/40">
          Not real-time yet — new messages appear within about 15 seconds.
        </p>
        <div className="mt-2 text-center">
          <Link to="/" className="text-xs text-brand-orange no-underline">
            ← Back to home
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
