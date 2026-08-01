const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { notFound, errorHandler } = require("./middleware/errorHandler");
const { handleWebhook } = require("./controllers/paymentController");
const releaseExpiredReservations = require("./utils/releaseExpiredReservations");

const app = express();

/* ------------------------------ Security ------------------------------- */
app.use(helmet());

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
// Baqi sab routes par normal JSON parsing
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

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

    /* ----------------------- Background cleanup -----------------------
     *
     * Har 2 minute baad expire hui seat reservations wapas chhodta hai.
     * Ye ek simple in-app timer hai - alag cron service ki zaroorat nahi.
     */
    setInterval(releaseExpiredReservations, 2 * 60 * 1000);
    // Ek baar start par bhi chala do
    releaseExpiredReservations();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
