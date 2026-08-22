const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

/* --------------------------- Env validation ----------------------------
 *
 * Agar zaroori secrets set na hon to app ko chalna hi nahi chahiye.
 * Warna JWT_SECRET undefined ke saath server chal parta hai aur
 * auth khamoshi se toot jati hai.
 */
["MONGO_URI", "JWT_SECRET"].forEach((key) => {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} is not set in .env`);
    process.exit(1);
  }
});

if (process.env.JWT_SECRET.length < 32) {
  const msg =
    "JWT_SECRET is shorter than 32 characters — brute-force ke liye kamzor hai.";
  if (process.env.NODE_ENV === "production") {
    console.error(`FATAL: ${msg}`);
    process.exit(1);
  }
  console.warn(`WARNING: ${msg}`);
}

if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
  console.error("FATAL: CLIENT_URL must be set in production (CORS).");
  process.exit(1);
}

const { notFound, errorHandler } = require("./middleware/errorHandler");
const sanitizeRequest = require("./middleware/sanitize");
const { handleWebhook } = require("./controllers/paymentController");
const releaseExpiredReservations = require("./utils/releaseExpiredReservations");

const app = express();

// Host (Render/Railway/Vercel) proxy ke peeche chalta hai. Is ke baghair
// express-rate-limit har request ka IP proxy ka samajhta hai — yaani
// poori site ke users ek hi limit share karte hain.
app.set("trust proxy", 1);

/* ------------------------------ Security ------------------------------- */
app.use(helmet());

// Schema me jo field nahi, us par query na chale.
mongoose.set("strictQuery", true);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

/* --------------------------- Stripe webhook ----------------------------
 *
 * ZAROORI: ye route JSON parser se PEHLE aana chahiye.
 *
 * Stripe ki signature verify karne ke liye body bilkul waisi chahiye
 * jaisi Stripe ne bheji (raw). Agar express.json() ise pehle parse kar
 * de to signature match nahi hogi aur har payment reject ho jayega.
 *
 * Is liye sirf is ek route par express.raw() lagta hai.
 */
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);

/* ------------------------------ Body parse ------------------------------ */
// Baqi sab routes par normal JSON parsing.
// 5mb bohat zyada tha — bare payloads se server ki memory bhari ja sakti hai.
// Files multer (multipart) se jati hain, un par is limit ka koi asar nahi.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// httpOnly auth cookie parhne ke liye
app.use(cookieParser());

/**
 * NoSQL injection se bachao — user ki bheji hui body/query me se
 * "$" wale Mongo operators aur dotted paths nikal deta hai.
 *
 * Yeh webhook ke BAAD hai (webhook ki raw body ko haath nahi lagna chahiye)
 * aur routes se PEHLE.
 */
app.use(sanitizeRequest);

/* ------------------------------ Rate limit ------------------------------ */
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
  }),
);

/* ------------------------------- Routes -------------------------------- */
app.get("/", (req, res) => {
  res.send("Kidventures API is running...");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Kidventures API is running",
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/activities", require("./routes/activityRoutes"));
app.use("/api/instructors", require("./routes/instructorRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/uploads", require("./routes/uploadRoutes"));
app.use("/api/children", require("./routes/childRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/class-requests", require("./routes/classRequestRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));

/* --------------------------- Error handling ----------------------------- */
app.use(notFound);
app.use(errorHandler);

/* -------------------------------- Start -------------------------------- */
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    /**
     * Reservation cleanup cron.
     *
     * Agar app PM2 cluster ya multiple instances par chale to yeh har
     * instance me chalti hai — aur ek hi booking ki seats kai dafa release
     * ho sakti hain. Is liye sirf pehle worker par chalao.
     * (Single instance par NODE_APP_INSTANCE hota hi nahi, to normal chalega.)
     */
    const instanceId = process.env.NODE_APP_INSTANCE;

    if (!instanceId || instanceId === "0") {
      setInterval(releaseExpiredReservations, 2 * 60 * 1000);
      releaseExpiredReservations();
    } else {
      console.log(`Reservation cleanup skipped on worker ${instanceId}`);
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
