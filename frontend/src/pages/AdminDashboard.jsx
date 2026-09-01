import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../api/axios";
import { toList } from "../api/normalize";
import { logout } from "../api/auth";

/* Cloudinary URL ko resize+auto-optimize karta hai. Agar URL Cloudinary
   ka na ho, waisi hi wapas kar deta hai. */
const cldOptimize = (url, width = 150) => {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com"))
    return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
};

/* -------------------------------- icons -------------------------------- */
const I = ({ children, size = 18, sw = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
const IcDash = (p) => (
  <I {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </I>
);
const IcVerify = (p) => (
  <I {...p}>
    <path d="M9 12l2 2 4-4" />
    <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z" />
  </I>
);
const IcPeople = (p) => (
  <I {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </I>
);
const IcBook = (p) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </I>
);
const IcTag = (p) => (
  <I {...p}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </I>
);
const IcStar = (p) => (
  <I {...p}>
    <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9" />
  </I>
);
const IcLogout = (p) => (
  <I {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </I>
);
const IcCheck = (p) => (
  <I {...p}>
    <polyline points="20 6 9 17 4 12" />
  </I>
);
const IcX = (p) => (
  <I {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </I>
);
const IcDoc = (p) => (
  <I {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </I>
);
const IcEye = (p) => (
  <I {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </I>
);
const IcClasses = (p) => (
  <I {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </I>
);
const IcUser = (p) => (
  <I {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </I>
);
const IcTrash = (p) => (
  <I {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </I>
);
const IcEdit = (p) => (
  <I {...p}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </I>
);
const IcMenu = (p) => (
  <I {...p}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </I>
);

const AED = (n) =>
  "AED " +
  (Number(n) || 0).toLocaleString("en-AE", { maximumFractionDigits: 0 });
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt)
    ? ""
    : dt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

function StatusPill({ status }) {
  const map = {
    approved: "bg-green-100 text-green-700",
    active: "bg-green-100 text-green-700",
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    pending: "bg-sky-100 text-sky-700",
    rejected: "bg-red-100 text-red-700",
    suspended: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
    refunded: "bg-red-100 text-red-700",
    draft: "bg-gray-100 text-gray-600",
    archived: "bg-gray-100 text-gray-600",
    incomplete: "bg-amber-100 text-amber-700",
  };
  const cls = map[status] || "bg-brand-cream text-brand-orange";
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>
      {status}
    </span>
  );
}

const navItems = [
  { key: "overview", label: "Overview", icon: IcDash },
  { key: "verification", label: "Instructor Verification", icon: IcVerify },
  { key: "instructors", label: "Instructors", icon: IcPeople },
  { key: "classes", label: "Classes", icon: IcClasses },
  { key: "users", label: "Users", icon: IcUser },
  { key: "bookings", label: "Bookings", icon: IcBook },
  { key: "refunds", label: "Refunds", icon: IcBook },
  { key: "categories", label: "Categories", icon: IcTag },
  { key: "requests", label: "Class Requests", icon: IcStar },
];

/* -------------------- small reusable "reason" modal -------------------- */
function ReasonModal({ title, warn, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  const tooShort = reason.trim().length < 10;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-6">
        <h3 className="mb-1 text-base font-bold">{title}</h3>
        {warn && <p className="mb-3 text-xs opacity-60">{warn}</p>}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain the reason (at least 10 characters)…"
          className="mb-1 min-h-[90px] w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
        />
        {reason && tooShort && (
          <div className="mb-2 text-xs text-red-600">
            Please write at least 10 characters.
          </div>
        )}
        <div className="mt-3 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => !tooShort && onConfirm(reason.trim())}
            disabled={tooShort}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState("");

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const doLogout = async () => {
    // logout ab server ko call karta hai taake httpOnly cookie clear ho.
    // await ke baghair page navigate ho jata aur request cancel ho sakti thi.
    await logout();
    window.location.href = "/login";
  };

  /* ---------------------------- overview stats --------------------------- */
  const [stats, setStats] = useState(null);
  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/stats");
      setStats(data.stats);
    } catch {
      /* ignore */
    }
  }, []);

  /* --------------------------- instructor verification --------------------------- */
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [viewingDetail, setViewingDetail] = useState(null);
  const [viewingDocs, setViewingDocs] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [rejectFor, setRejectFor] = useState(null); // profile id
  const [suspendFor, setSuspendFor] = useState(null); // profile id

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const { data } = await api.get("/admin/instructors", {
        params: { status: "pending" },
      });
      setPending(toList(data.instructors));
    } catch {
      /* ignore */
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const openApplication = async (id) => {
    setViewingId(id);
    setViewingDetail(null);
    setViewingDocs(null);
    try {
      const { data } = await api.get(`/admin/instructors/${id}`);
      setViewingDetail(data.instructor);
    } catch {
      flash("Couldn't load this application.");
    }
  };
  const loadDocLinks = async () => {
    if (!viewingId) return;
    setDocsLoading(true);
    try {
      const { data } = await api.get(`/uploads/admin/documents/${viewingId}`);
      setViewingDocs(data.documents);
    } catch {
      flash("Couldn't load documents.");
    } finally {
      setDocsLoading(false);
    }
  };

  const approveInstructor = async (id) => {
    try {
      await api.put(`/admin/instructors/${id}/approve`);
      setPending((p) => p.filter((x) => x._id !== id));
      setViewingId(null);
      loadStats();
      flash("Instructor approved and is now live.");
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't approve.");
    }
  };
  const rejectInstructor = async (id, reason) => {
    try {
      await api.put(`/admin/instructors/${id}/reject`, { reason });
      setPending((p) => p.filter((x) => x._id !== id));
      setRejectFor(null);
      setViewingId(null);
      loadStats();
      flash("Instructor rejected.");
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't reject.");
    }
  };

  /* --------------------------- approved instructors list --------------------------- */
  const [instructors, setInstructors] = useState([]);
  const [instructorsLoading, setInstructorsLoading] = useState(false);
  const loadInstructors = useCallback(async () => {
    setInstructorsLoading(true);
    try {
      const { data } = await api.get("/admin/instructors", {
        params: { status: "approved" },
      });
      setInstructors(toList(data.instructors));
    } catch {
      /* ignore */
    } finally {
      setInstructorsLoading(false);
    }
  }, []);

  const doSuspendInstructor = async (id, reason) => {
    try {
      const { data } = await api.put(`/admin/instructors/${id}/suspend`, {
        reason,
      });
      setInstructors((list) =>
        list.map((x) => (x._id === id ? data.profile : x)),
      );
      setSuspendFor(null);
      flash(data.message);
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't update instructor.");
    }
  };
  const reinstateInstructor = async (id) => {
    try {
      const { data } = await api.put(`/admin/instructors/${id}/suspend`, {});
      setInstructors((list) =>
        list.map((x) => (x._id === id ? data.profile : x)),
      );
      flash(data.message);
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't reinstate.");
    }
  };
  const toggleFeature = async (id) => {
    try {
      const { data } = await api.put(`/admin/instructors/${id}/feature`);
      setInstructors((list) =>
        list.map((x) => (x._id === id ? data.profile : x)),
      );
      flash(data.message);
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't update.");
    }
  };

  /* -------------------------------- classes -------------------------------- */
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [viewClass, setViewClass] = useState(null);
  const [categories, setCategories] = useState([]);
  const [pickCategoryFor, setPickCategoryFor] = useState(null); // activity
  const [pickedCategory, setPickedCategory] = useState("");

  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const [{ data }, catRes] = await Promise.all([
        api.get("/admin/activities"),
        api.get("/categories").catch(() => ({ data: { categories: [] } })),
      ]);
      setClasses(toList(data.activities));
      setCategories(toList(catRes.data.categories || catRes.data));
    } catch {
      /* ignore */
    } finally {
      setClassesLoading(false);
    }
  }, []);

  const approveClass = async (id) => {
    try {
      const { data } = await api.put(`/admin/activities/${id}/approve`);
      setClasses((cs) => cs.map((c) => (c._id === id ? data.activity : c)));
      setViewClass(null);
      flash("Class is now live.");
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't approve class.");
    }
  };
  const toggleClassSuspend = async (id) => {
    try {
      const { data } = await api.put(`/admin/activities/${id}/suspend`);
      setClasses((cs) => cs.map((c) => (c._id === id ? data.activity : c)));
      setViewClass(null);
      flash(data.message);
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't update class.");
    }
  };
  const removeClass = async (id) => {
    try {
      const { data } = await api.delete(`/admin/activities/${id}`);
      if (data.activity) {
        setClasses((cs) => cs.map((c) => (c._id === id ? data.activity : c)));
      } else {
        setClasses((cs) => cs.filter((c) => c._id !== id));
      }
      setViewClass(null);
      flash(data.message);
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't remove class.");
    }
  };
  const resolveCategory = async () => {
    if (!pickCategoryFor || !pickedCategory) return;
    try {
      const { data } = await api.put(
        `/admin/activities/${pickCategoryFor._id}/resolve-category`,
        { categoryId: pickedCategory },
      );
      setClasses((cs) =>
        cs.map((c) => (c._id === pickCategoryFor._id ? data.activity : c)),
      );
      setPickCategoryFor(null);
      setPickedCategory("");
      flash(data.message);
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't assign category.");
    }
  };

  const needsCategoryReview = classes.filter(
    (c) => c.suggestedCategory && !c.category,
  );

  /* --------------------------------- users --------------------------------- */
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [viewUser, setViewUser] = useState(null);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(toList(data.users));
    } catch {
      /* ignore */
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const toggleBlock = async (id) => {
    try {
      const { data } = await api.put(`/admin/users/${id}/block`);
      setUsers((us) =>
        us.map((u) =>
          u._id === id ? { ...u, isBlocked: data.user.isBlocked } : u,
        ),
      );
      setViewUser(null);
      flash(data.message);
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't update user.");
    }
  };

  /* -------------------------------- bookings -------------------------------- */
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [refundFor, setRefundFor] = useState(null); // booking object

  /* ---------------------------- pending refunds ----------------------------
   *
   * Jab parent booking cancel karta hai to paisa khud-ba-khud wapas nahi jata —
   * booking par sirf "pending_review" ka nishan lagta hai. Yeh tab us kaam ki
   * qatar hai. Is ke baghair refund requests DB me pari reh jati hain aur kisi
   * ko pata nahi chalta.
   */
  const [refundQueue, setRefundQueue] = useState([]);
  const [refundQueueLoading, setRefundQueueLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const loadRefundQueue = useCallback(async () => {
    setRefundQueueLoading(true);
    try {
      const { data } = await api.get("/admin/refunds");
      setRefundQueue(toList(data.bookings));
    } catch {
      /* ignore */
    } finally {
      setRefundQueueLoading(false);
    }
  }, []);

  // Refund kar dene ke baad (ya "refund nahi banta" kehne par) qatar se hatao
  const resolveRefund = async (booking, status) => {
    setResolvingId(booking._id);
    try {
      const { data } = await api.put(`/admin/refunds/${booking._id}/resolve`, {
        status,
      });
      setRefundQueue((q) => q.filter((b) => b._id !== booking._id));
      flash(data?.message || "Marked as resolved");
    } catch (err) {
      flash(
        err?.response?.data?.message || "Couldn't update this refund.",
      );
      loadRefundQueue();
    } finally {
      setResolvingId(null);
    }
  };
  const [refundSaving, setRefundSaving] = useState(false);
  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const { data } = await api.get("/admin/bookings");
      setBookings(toList(data.bookings));
    } catch {
      /* ignore */
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const doRefund = async (amount, reason) => {
    if (!refundFor) return;
    setRefundSaving(true);
    try {
      const { data } = await api.post(`/payments/${refundFor._id}/refund`, {
        amount: amount || undefined,
        reason: reason || undefined,
      });
      setBookings((bs) =>
        bs.map((b) => (b._id === refundFor._id ? data.booking : b)),
      );

      // Agar yeh booking refunds ki qatar me thi to ab wahan se nikal do —
      // paisa wapas ja chuka hai, dobara review ki zaroorat nahi.
      const wasQueued = refundQueue.some((b) => b._id === refundFor._id);
      if (wasQueued) {
        setRefundQueue((q) => q.filter((b) => b._id !== refundFor._id));
        api
          .put(`/admin/refunds/${refundFor._id}/resolve`, {
            status: "processed",
          })
          .catch(() => {
            // Nishan na lag saka — qatar dobara load kar lo taake yeh
            // booking gum na ho jaye
            loadRefundQueue();
          });
      }

      setRefundFor(null);
      flash(data.message);
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't process the refund.");
    } finally {
      setRefundSaving(false);
    }
  };

  /* -------------------------------- categories -------------------------------- */
  const [catList, setCatList] = useState([]);
  const [newCatName, setNewCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [catDeletingId, setCatDeletingId] = useState(null);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState("");
  const [catEditSaving, setCatEditSaving] = useState(false);
  const loadCategoriesTab = useCallback(async () => {
    try {
      const { data } = await api.get("/categories");
      setCatList(toList(data.categories || data));
    } catch {
      /* ignore */
    }
  }, []);
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setCatSaving(true);
    try {
      const { data } = await api.post("/categories", {
        name: newCatName.trim(),
      });
      setCatList((cl) => [...cl, data.category || data]);
      setNewCatName("");
      flash("Category added.");
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't add category.");
    } finally {
      setCatSaving(false);
    }
  };
  const removeCategory = async (cat) => {
    const id = cat._id || cat.id;
    if (!window.confirm(`Remove "${cat.name}" category?`)) return;
    setCatDeletingId(id);
    try {
      const { data } = await api.delete(`/categories/${id}`);
      // Agar classes maujood thin to backend usay sirf hide karta hai
      // (isActive: false) instead of delete — is-liye list se hata dena hi theek hai.
      setCatList((cl) => cl.filter((c) => (c._id || c.id) !== id));
      flash(data.message || "Category removed.");
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't remove category.");
    } finally {
      setCatDeletingId(null);
    }
  };
  const startEditCategory = (c) => {
    setEditingCatId(c._id || c.id);
    setEditCatName(c.name);
  };
  const cancelEditCategory = () => {
    setEditingCatId(null);
    setEditCatName("");
  };
  const saveEditCategory = async (id) => {
    if (!editCatName.trim()) return;
    setCatEditSaving(true);
    try {
      const { data } = await api.put(`/categories/${id}`, {
        name: editCatName.trim(),
      });
      setCatList((cl) =>
        cl.map((c) => ((c._id || c.id) === id ? data.category || data : c)),
      );
      setEditingCatId(null);
      setEditCatName("");
      flash("Category updated.");
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't update category.");
    } finally {
      setCatEditSaving(false);
    }
  };

  /* ---------------------------- class requests ---------------------------- */
  const [classRequests, setClassRequests] = useState([]);
  const [classRequestsLoading, setClassRequestsLoading] = useState(false);
  const loadClassRequests = useCallback(async () => {
    setClassRequestsLoading(true);
    try {
      const { data } = await api.get("/admin/class-requests");
      setClassRequests(toList(data.requests));
    } catch {
      /* ignore */
    } finally {
      setClassRequestsLoading(false);
    }
  }, []);

  /* ------------------------------ tab loading ------------------------------ */
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab === "verification") loadPending();
    if (tab === "instructors") loadInstructors();
    if (tab === "classes") loadClasses();
    if (tab === "users") loadUsers();
    if (tab === "bookings") loadBookings();
    if (tab === "refunds") loadRefundQueue();
    if (tab === "categories") loadCategoriesTab();
    if (tab === "requests") loadClassRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* -------------------------------- sidebar -------------------------------- */
  const Sidebar = (
    <div className="flex h-full flex-col bg-brand-brown py-5 text-white">
      <div className="flex items-center justify-between px-5 pb-4">
        <div>
          <Link to="/" className="text-xl font-extrabold text-brand-gold">
            Kidventures
          </Link>
          <div className="mt-0.5 text-[10px] opacity-60">Admin Panel</div>
        </div>
        <button
          className="text-white/70 lg:hidden"
          onClick={() => setDrawer(false)}
        >
          <IcX size={20} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {navItems.map(({ key, label, icon: Icon }) => {
          const on = tab === key;
          return (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setDrawer(false);
              }}
              className={`flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm ${
                on
                  ? "border-l-[3px] border-brand-gold bg-brand-gold/15 font-bold text-brand-gold"
                  : "border-l-[3px] border-transparent text-white/85 hover:bg-white/5"
              }`}
            >
              <Icon size={17} /> {label}
              {key === "verification" && pending.length > 0 && (
                <span className="ml-auto rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">
                  {pending.length}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={doLogout}
          className="mt-2 flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm text-white/85 hover:bg-white/5"
        >
          <IcLogout size={17} /> Logout
        </button>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-brand-brown">
      <Helmet>
        <title>Admin Dashboard — Kidventures</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-brand-brown px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 lg:block">
          {Sidebar}
        </aside>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawer(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[260px]">
              {Sidebar}
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-7">
          <div className="mb-5 flex items-center gap-3">
            <button
              className="text-brand-brown lg:hidden"
              onClick={() => setDrawer(true)}
            >
              <IcMenu size={22} />
            </button>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">
                {navItems.find((n) => n.key === tab)?.label}
              </h1>
              <p className="text-xs opacity-60">
                Manage the Kidventures platform.
              </p>
            </div>
          </div>

          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  label: "Pending Verifications",
                  value: stats?.pendingVerifications ?? "…",
                },
                {
                  label: "Active Instructors",
                  value: stats?.activeInstructors ?? "…",
                },
                { label: "Total Bookings", value: stats?.totalBookings ?? "…" },
                {
                  label: "Revenue (This Month)",
                  value: stats ? AED(stats.monthRevenue) : "…",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 text-xs opacity-60">{s.label}</div>
                  <div className="text-xl font-bold text-brand-orange sm:text-2xl">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VERIFICATION */}
          {tab === "verification" && (
            <>
              {pendingLoading ? (
                <div className="rounded-2xl bg-white p-10 text-center text-sm opacity-60 shadow-sm">
                  Loading…
                </div>
              ) : pending.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                  <div className="mb-3 flex justify-center text-green-600">
                    <IcVerify size={38} />
                  </div>
                  <h3 className="mb-1 text-base font-bold">All caught up!</h3>
                  <p className="text-sm opacity-60">
                    No pending instructor applications right now.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {pending.map((p) => (
                    <div
                      key={p._id}
                      className="rounded-2xl bg-white p-4.5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start gap-3.5">
                        {p.user?.avatar?.url ? (
                          <img
                            src={cldOptimize(p.user.avatar.url, 100)}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded-full bg-brand-gold" />
                        )}
                        <div className="min-w-[200px] flex-1">
                          <div className="text-[15px] font-bold">
                            {p.user?.name || "Instructor"}
                          </div>
                          <div className="text-xs font-semibold text-brand-orange">
                            {(p.categories || [])
                              .map((c) => c.name)
                              .join(", ") ||
                              p.suggestedCategory ||
                              p.headline ||
                              ""}
                          </div>
                          <div className="mt-0.5 text-xs opacity-60">
                            {p.user?.email} · {p.user?.phone}
                          </div>
                          {p.bio && (
                            <p className="mt-2 line-clamp-2 text-xs leading-relaxed opacity-80">
                              {p.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
                        <button
                          onClick={() => openApplication(p._id)}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold"
                        >
                          <IcEye size={14} /> Review application
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRejectFor(p._id)}
                            className="flex items-center gap-1.5 rounded-lg border border-red-600 bg-white px-4 py-2 text-xs font-bold text-red-600"
                          >
                            <IcX size={14} /> Reject
                          </button>
                          <button
                            onClick={() => approveInstructor(p._id)}
                            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white"
                          >
                            <IcCheck size={14} /> Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* INSTRUCTORS */}
          {tab === "instructors" && (
            <div className="rounded-2xl bg-white px-4.5 shadow-sm">
              {instructorsLoading ? (
                <div className="py-10 text-center text-sm opacity-60">
                  Loading…
                </div>
              ) : instructors.length === 0 ? (
                <div className="py-10 text-center text-sm opacity-60">
                  No approved instructors yet.
                </div>
              ) : (
                instructors.map((ins, i) => (
                  <div
                    key={ins._id}
                    className={`flex flex-wrap items-center gap-3.5 py-3.5 ${
                      i < instructors.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    {ins.user?.avatar?.url ? (
                      <img
                        src={cldOptimize(ins.user.avatar.url, 80)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-full bg-brand-gold" />
                    )}
                    <div className="min-w-[160px] flex-1">
                      <div className="text-sm font-bold">{ins.user?.name}</div>
                      <div className="text-xs opacity-60">
                        {(ins.categories || []).map((c) => c.name).join(", ")}
                        {ins.isFeatured ? " · Featured" : ""}
                      </div>
                    </div>
                    <StatusPill
                      status={ins.isSuspended ? "suspended" : "approved"}
                    />
                    <button
                      onClick={() => toggleFeature(ins._id)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold"
                    >
                      {ins.isFeatured ? "Unfeature" : "Feature"}
                    </button>
                    {ins.isSuspended ? (
                      <button
                        onClick={() => reinstateInstructor(ins._id)}
                        className="rounded-lg border border-green-600 bg-white px-3 py-1.5 text-xs font-semibold text-green-600"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => setSuspendFor(ins._id)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* CLASSES */}
          {tab === "classes" && (
            <>
              {needsCategoryReview.length > 0 && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-2 text-sm font-bold text-amber-900">
                    {needsCategoryReview.length} class(es) need a category
                    assigned
                  </div>
                  <div className="flex flex-col gap-2">
                    {needsCategoryReview.map((c) => (
                      <div
                        key={c._id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3.5 py-2.5"
                      >
                        <div className="text-xs">
                          <b>{c.title}</b> — suggested: "{c.suggestedCategory}"
                        </div>
                        <button
                          onClick={() => setPickCategoryFor(c)}
                          className="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-bold text-white"
                        >
                          Assign category
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-white px-4.5 shadow-sm">
                {classesLoading ? (
                  <div className="py-10 text-center text-sm opacity-60">
                    Loading…
                  </div>
                ) : classes.length === 0 ? (
                  <div className="py-10 text-center text-sm opacity-60">
                    No classes.
                  </div>
                ) : (
                  classes.map((c, i) => (
                    <div
                      key={c._id}
                      className={`flex flex-wrap items-center gap-3.5 py-3.5 ${
                        i < classes.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-brand-cream">
                        {c.images?.[0]?.url && (
                          <img
                            src={cldOptimize(c.images[0].url, 90)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-[180px] flex-1">
                        <div className="text-sm font-bold">{c.title}</div>
                        <div className="text-xs opacity-60">
                          {c.category?.name || c.suggestedCategory || "—"} · by{" "}
                          {c.instructor?.name || "—"} · AED {c.price}
                        </div>
                      </div>
                      <StatusPill status={c.status} />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewClass(c)}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold"
                        >
                          <IcEye size={13} /> View
                        </button>
                        {c.status === "pending" ? (
                          <button
                            onClick={() => approveClass(c._id)}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleClassSuspend(c._id)}
                            className="rounded-lg border border-brand-orange bg-white px-3 py-1.5 text-xs font-semibold text-brand-orange"
                          >
                            {c.status === "suspended" ? "Unsuspend" : "Suspend"}
                          </button>
                        )}
                        <button
                          onClick={() => removeClass(c._id)}
                          className="flex items-center gap-1 rounded-lg border border-red-600 bg-white px-3 py-1.5 text-xs font-semibold text-red-600"
                        >
                          <IcTrash size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* USERS */}
          {tab === "users" && (
            <div className="rounded-2xl bg-white px-4.5 shadow-sm">
              {usersLoading ? (
                <div className="py-10 text-center text-sm opacity-60">
                  Loading…
                </div>
              ) : users.length === 0 ? (
                <div className="py-10 text-center text-sm opacity-60">
                  No users.
                </div>
              ) : (
                users.map((u, i) => (
                  <div
                    key={u._id}
                    className={`flex flex-wrap items-center gap-3.5 py-3.5 ${
                      u.isBlocked ? "opacity-60" : ""
                    } ${i < users.length - 1 ? "border-b border-gray-100" : ""}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-sky text-white">
                      <IcUser size={19} />
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <div className="text-sm font-bold">{u.name}</div>
                      <div className="text-xs opacity-60">
                        {u.email} · {u.role} · joined {fmtDate(u.createdAt)}
                      </div>
                    </div>
                    {u.isBlocked && <StatusPill status="suspended" />}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewUser(u)}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold"
                      >
                        <IcEye size={13} /> View
                      </button>
                      <button
                        onClick={() => toggleBlock(u._id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          u.isBlocked
                            ? "border-green-600 text-green-600"
                            : "border-red-600 text-red-600"
                        } bg-white`}
                      >
                        {u.isBlocked ? "Unblock" : "Block"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* BOOKINGS */}
          {tab === "bookings" && (
            <div className="rounded-2xl bg-white px-4.5 shadow-sm">
              {bookingsLoading ? (
                <div className="py-10 text-center text-sm opacity-60">
                  Loading…
                </div>
              ) : bookings.length === 0 ? (
                <div className="py-10 text-center text-sm opacity-60">
                  No bookings yet.
                </div>
              ) : (
                bookings.map((b, i) => {
                  const isRefunded =
                    b.status === "refunded" ||
                    b.paymentStatus === "refunded" ||
                    b.paymentStatus === "partially_refunded";
                  return (
                    <div
                      key={b._id}
                      className={`flex flex-wrap items-center gap-3.5 py-3.5 ${
                        isRefunded ? "bg-red-50/60" : ""
                      } ${
                        i < bookings.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }`}
                    >
                      <div className="min-w-[180px] flex-1">
                        <div className="text-sm font-bold">
                          {b.activityTitle || b.activity?.title || "Class"}
                        </div>
                        <div className="text-xs opacity-60">
                          {b.parent?.name || "Parent"} · {b.bookingNumber} ·{" "}
                          {fmtDate(b.createdAt)}
                        </div>
                        {isRefunded && (
                          <div className="mt-1 text-[11px] font-semibold text-red-600">
                            ⚠ Do not pay out the instructor for this booking
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-bold">
                        {AED(b.totalAmount)}
                      </div>
                      <StatusPill status={b.status} />
                      {(b.status === "confirmed" ||
                        b.paymentStatus === "partially_refunded") && (
                        <button
                          onClick={() => setRefundFor(b)}
                          className="rounded-lg border border-red-600 bg-white px-3 py-1.5 text-xs font-semibold text-red-600"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* REFUNDS — cancelled bookings waiting on a refund decision */}
          {tab === "refunds" && (
            <div className="rounded-2xl bg-white px-4.5 shadow-sm">
              <div className="border-b border-gray-100 py-4">
                <div className="text-sm font-bold">Refunds to review</div>
                <div className="mt-1 text-xs opacity-65">
                  Parents cancelled these bookings. Money has NOT been returned
                  yet — refund from here, then mark it resolved.
                </div>
              </div>

              {refundQueueLoading ? (
                <div className="py-10 text-center text-sm opacity-60">
                  Loading…
                </div>
              ) : refundQueue.length === 0 ? (
                <div className="py-10 text-center text-sm opacity-60">
                  Nothing waiting. All cancellations have been dealt with.
                </div>
              ) : (
                refundQueue.map((b, i) => {
                  const tier = b.cancellation?.refundTier;
                  const tierStyle =
                    tier === "full"
                      ? "bg-green-100 text-green-800"
                      : tier === "partial"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-700";
                  const tierLabel =
                    tier === "full"
                      ? "FULL REFUND"
                      : tier === "partial"
                        ? "PARTIAL — YOU DECIDE"
                        : String(tier || "").toUpperCase();

                  // 48 ghante se zyada intezar = parent shikayat karne wala hai
                  const stale = (b.hoursWaiting ?? 0) >= 48;

                  return (
                    <div
                      key={b._id}
                      className={`flex flex-wrap items-center gap-3.5 py-3.5 ${
                        stale ? "bg-red-50/60" : ""
                      } ${
                        i < refundQueue.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }`}
                    >
                      <div className="min-w-[220px] flex-1">
                        <div className="text-sm font-bold">
                          {b.activityTitle || b.activity?.title || "Class"}
                        </div>
                        <div className="text-xs opacity-60">
                          {b.parent?.name || "Parent"}
                          {b.parent?.email ? ` · ${b.parent.email}` : ""} ·{" "}
                          {b.bookingNumber}
                        </div>
                        <div className="mt-1 text-xs opacity-60">
                          Cancelled {fmtDate(b.cancellation?.cancelledAt)}
                          {b.hoursWaiting != null
                            ? ` · waiting ${b.hoursWaiting}h`
                            : ""}
                          {b.cancellation?.reason
                            ? ` · "${b.cancellation.reason}"`
                            : ""}
                        </div>
                        {stale && (
                          <div className="mt-1 text-[11px] font-semibold text-red-600">
                            ⚠ Waiting more than 48 hours
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {AED(b.totalAmount)}
                        </div>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${tierStyle}`}
                        >
                          {tierLabel}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setRefundFor(b)}
                          disabled={resolvingId === b._id}
                          className="rounded-lg border border-red-600 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                        >
                          Refund
                        </button>
                        <button
                          onClick={() => resolveRefund(b, "processed")}
                          disabled={resolvingId === b._id}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                          title="Already refunded — just clear it from this list"
                        >
                          Mark done
                        </button>
                        <button
                          onClick={() => resolveRefund(b, "not_required")}
                          disabled={resolvingId === b._id}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold opacity-70 disabled:opacity-50"
                          title="No refund is due for this cancellation"
                        >
                          No refund
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* CATEGORIES */}
          {tab === "categories" && (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap gap-2.5">
                {catList.map((c) => {
                  const id = c._id || c.id;

                  if (editingCatId === id) {
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-1.5 rounded-full bg-brand-cream py-1.5 pl-3.5 pr-1.5"
                      >
                        <input
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditCategory(id);
                            if (e.key === "Escape") cancelEditCategory();
                          }}
                          autoFocus
                          className="w-32 rounded-md border border-gray-200 bg-white px-2 py-1 text-[13px] outline-none focus:border-brand-orange"
                        />
                        <button
                          onClick={() => saveEditCategory(id)}
                          disabled={catEditSaving || !editCatName.trim()}
                          className="rounded-md bg-brand-orange px-2 py-1 text-[11px] font-bold text-white disabled:opacity-60"
                        >
                          {catEditSaving ? "…" : "Save"}
                        </button>
                        <button
                          onClick={cancelEditCategory}
                          disabled={catEditSaving}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  }

                  return (
                    <span
                      key={id}
                      className="flex items-center gap-2 rounded-full bg-brand-cream px-3.5 py-2 text-[13px] font-semibold"
                    >
                      {c.name}
                      <button
                        onClick={() => startEditCategory(c)}
                        title={`Edit ${c.name}`}
                        className="flex h-4 w-4 items-center justify-center text-brand-brown/50 hover:text-brand-orange"
                      >
                        <IcEdit size={12} />
                      </button>
                      <button
                        onClick={() => removeCategory(c)}
                        disabled={catDeletingId === id}
                        title={`Remove ${c.name}`}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-brand-brown/50 hover:bg-brand-orange hover:text-white disabled:opacity-40"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex gap-2.5">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-orange"
                />
                <button
                  onClick={addCategory}
                  disabled={catSaving}
                  className="rounded-lg bg-brand-orange px-5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {catSaving ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          )}

          {/* CLASS REQUESTS */}
          {tab === "requests" && (
            <>
              <div className="mb-4.5 rounded-xl bg-brand-cream px-4.5 py-3.5 text-[13px] leading-relaxed">
                These are classes parents searched for but couldn't find. Use
                this to decide which instructors to recruit next — the highest
                demand is at the top.
              </div>
              <div className="rounded-2xl bg-white px-4.5 shadow-sm">
                {classRequestsLoading ? (
                  <div className="py-10 text-center text-sm opacity-60">
                    Loading…
                  </div>
                ) : classRequests.length === 0 ? (
                  <div className="py-10 text-center text-sm opacity-60">
                    No requests yet.
                  </div>
                ) : (
                  classRequests.map((r, i) => {
                    const max = classRequests[0].count || 1;
                    const pct = Math.round((r.count / max) * 100);
                    return (
                      <div
                        key={`${r.category}-${r.area}-${r.age}`}
                        className={`flex flex-wrap items-center gap-3.5 py-3.5 ${
                          i < classRequests.length - 1
                            ? "border-b border-gray-100"
                            : ""
                        }`}
                      >
                        <div
                          className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg text-[13px] font-bold ${
                            i < 3
                              ? "bg-brand-orange text-white"
                              : "bg-brand-cream text-brand-brown"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-[200px] flex-1">
                          <div className="text-sm font-bold">{r.category}</div>
                          <div className="mb-1.5 text-xs opacity-60">
                            {r.area} · Ages {r.age} · latest {fmtDate(r.latest)}
                          </div>
                          <div className="h-1.5 max-w-[260px] overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full ${
                                i < 3 ? "bg-brand-orange" : "bg-brand-sky"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="min-w-[70px] text-center">
                          <div className="text-lg font-bold text-brand-orange">
                            {r.count}
                          </div>
                          <div className="text-[10px] opacity-60">requests</div>
                        </div>
                        <button
                          onClick={() =>
                            flash(
                              "Email notifications aren't wired yet — coming with the emails step.",
                            )
                          }
                          className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold"
                        >
                          Notify {r.notifyCount} parent
                          {r.notifyCount === 1 ? "" : "s"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Application review modal */}
      {viewingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5">
          <div className="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {viewingDetail?.user?.name || "Loading…"}'s application
              </h3>
              <button onClick={() => setViewingId(null)}>
                <IcX size={20} />
              </button>
            </div>
            {!viewingDetail ? (
              <div className="py-8 text-center text-sm opacity-60">
                Loading…
              </div>
            ) : (
              <>
                <div className="mb-4 space-y-1.5 text-[13px]">
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="opacity-60">Email</span>
                    <b>{viewingDetail.user?.email}</b>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="opacity-60">Phone</span>
                    <b>{viewingDetail.user?.phone}</b>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="opacity-60">Categories</span>
                    <b>
                      {(viewingDetail.categories || [])
                        .map((c) => c.name)
                        .join(", ") ||
                        viewingDetail.suggestedCategory ||
                        "—"}
                    </b>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="opacity-60">Based in UAE</span>
                    <b>{viewingDetail.inUAE ? "Yes" : "No"}</b>
                  </div>
                  {viewingDetail.introVideoUrl && (
                    <div className="flex justify-between border-b border-gray-100 py-2">
                      <span className="opacity-60">Intro video</span>
                      <a
                        href={viewingDetail.introVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-brand-orange"
                      >
                        Open link
                      </a>
                    </div>
                  )}
                </div>
                {viewingDetail.bio && (
                  <p className="mb-4 text-[13px] leading-relaxed opacity-80">
                    {viewingDetail.bio}
                  </p>
                )}

                <div className="mb-4">
                  {!viewingDocs ? (
                    <button
                      onClick={loadDocLinks}
                      disabled={docsLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold disabled:opacity-60"
                    >
                      <IcDoc size={14} />{" "}
                      {docsLoading ? "Loading…" : "Load verification documents"}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-[11px] opacity-60">
                        Links expire in 10 minutes.
                      </p>
                      {[
                        ["Emirates ID", viewingDocs.emiratesId],
                        ["Trade Licence", viewingDocs.tradeLicence],
                        ...(viewingDocs.certificates || []).map((c, i) => [
                          `Certificate ${i + 1}`,
                          c,
                        ]),
                      ]
                        .filter(([, doc]) => doc)
                        .map(([label, doc]) => (
                          <a
                            key={label}
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] font-semibold"
                          >
                            <IcDoc size={16} className="text-brand-orange" />
                            <span className="flex-1">{label}</span>
                            <span className="text-brand-sky">Open</span>
                          </a>
                        ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2.5">
                  <button
                    onClick={() => setRejectFor(viewingId)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-600 bg-white px-4 py-2 text-sm font-bold text-red-600"
                  >
                    <IcX size={14} /> Reject
                  </button>
                  <button
                    onClick={() => approveInstructor(viewingId)}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2 text-sm font-bold text-white"
                  >
                    <IcCheck size={14} /> Approve
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Class view modal */}
      {viewClass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{viewClass.title}</h3>
              <button onClick={() => setViewClass(null)}>
                <IcX size={20} />
              </button>
            </div>
            <div className="mb-4 h-28 overflow-hidden rounded-xl bg-brand-cream">
              {viewClass.images?.[0]?.url && (
                <img
                  src={cldOptimize(viewClass.images[0].url, 400)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="mb-5 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="opacity-60">Instructor</span>
                <b>{viewClass.instructor?.name}</b>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Category</span>
                <b>{viewClass.category?.name || viewClass.suggestedCategory}</b>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Price</span>
                <b>AED {viewClass.price}</b>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Status</span>
                <b>{viewClass.status}</b>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              {viewClass.status === "pending" ? (
                <button
                  onClick={() => approveClass(viewClass._id)}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white"
                >
                  Approve
                </button>
              ) : (
                <button
                  onClick={() => toggleClassSuspend(viewClass._id)}
                  className="rounded-lg border border-brand-orange bg-white px-4 py-2 text-sm font-bold text-brand-orange"
                >
                  {viewClass.status === "suspended" ? "Unsuspend" : "Suspend"}
                </button>
              )}
              <button
                onClick={() => removeClass(viewClass._id)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User view modal */}
      {viewUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{viewUser.name}</h3>
              <button onClick={() => setViewUser(null)}>
                <IcX size={20} />
              </button>
            </div>
            <div className="mb-5 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="opacity-60">Email</span>
                <b>{viewUser.email}</b>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Role</span>
                <b>{viewUser.role}</b>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Joined</span>
                <b>{fmtDate(viewUser.createdAt)}</b>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => toggleBlock(viewUser._id)}
                className={`rounded-lg border px-4 py-2 text-sm font-bold ${
                  viewUser.isBlocked
                    ? "border-green-600 text-green-600"
                    : "border-red-600 text-red-600"
                } bg-white`}
              >
                {viewUser.isBlocked ? "Unblock user" : "Block user"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category assignment modal */}
      {pickCategoryFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-6">
            <h3 className="mb-1 text-base font-bold">Assign a category</h3>
            <p className="mb-3 text-xs opacity-60">
              "{pickCategoryFor.title}" — suggested: "
              {pickCategoryFor.suggestedCategory}"
            </p>
            <select
              value={pickedCategory}
              onChange={(e) => setPickedCategory(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setPickCategoryFor(null);
                  setPickedCategory("");
                }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={resolveCategory}
                disabled={!pickedCategory}
                className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectFor && (
        <ReasonModal
          title="Reject this instructor"
          warn="They'll see this reason and can reapply after fixing it."
          onCancel={() => setRejectFor(null)}
          onConfirm={(reason) => rejectInstructor(rejectFor, reason)}
        />
      )}

      {/* Suspend reason modal */}
      {suspendFor && (
        <ReasonModal
          title="Suspend this instructor"
          warn="All their live classes will be suspended too."
          onCancel={() => setSuspendFor(null)}
          onConfirm={(reason) => doSuspendInstructor(suspendFor, reason)}
        />
      )}

      {/* Refund modal */}
      {refundFor && (
        <RefundModal
          booking={refundFor}
          saving={refundSaving}
          onCancel={() => setRefundFor(null)}
          onConfirm={doRefund}
        />
      )}
    </div>
  );
}

/* -------------------------- refund modal -------------------------- */
function RefundModal({ booking, saving, onCancel, onConfirm }) {
  const [amount, setAmount] = useState(""); // blank = full refund
  const [reason, setReason] = useState("");
  const full = booking.totalAmount;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-6">
        <h3 className="mb-1 text-base font-bold">Refund this booking</h3>
        <p className="mb-4 text-xs opacity-60">
          {booking.activityTitle || booking.activity?.title} —{" "}
          {booking.bookingNumber}
        </p>

        <label className="mb-1.5 block text-xs font-semibold text-brand-brown/80">
          Amount (AED) — leave blank for a full refund of {AED(full)}
        </label>
        <input
          type="number"
          min="0"
          max={full}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={String(full)}
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
        />

        <label className="mb-1.5 block text-xs font-semibold text-brand-brown/80">
          Reason (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Class was cancelled by the instructor"
          className="mb-1 min-h-[70px] w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
        />

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm(amount ? Number(amount) : null, reason.trim())
            }
            disabled={saving}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Refunding…" : "Confirm refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
