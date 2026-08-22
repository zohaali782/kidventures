/**
 * Backend security tests.
 *
 * Chalane ka tareeqa (backend server chalta hua hona chahiye):
 *   node security-test.js
 *
 * PowerShell curl/Invoke-RestMethod ki quoting JSON tor deti hai, is liye
 * yeh script Node se seedha request bhejti hai — koi shell quoting nahi.
 *
 * Testing ke baad yeh file delete kar sakti hain.
 */

const BASE = process.env.API_BASE || "http://localhost:5000";

const post = async (path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { raw: "<not json>" };
  }
  return { status: res.status, data, headers: res.headers };
};

const line = (s) => console.log(s);
const pass = (name, detail) => line(`  PASS  ${name}${detail ? " — " + detail : ""}`);
const fail = (name, detail) => line(`  FAIL  ${name}${detail ? " — " + detail : ""}`);

const run = async () => {
  line("");
  line("Kidventures — backend security tests");
  line(`Target: ${BASE}`);
  line("");

  /* ---------------- 1. Server zinda hai? ---------------- */
  try {
    const res = await fetch(`${BASE}/api/health`);
    if (!res.ok) throw new Error("health check " + res.status);
    pass("server reachable");
  } catch (err) {
    fail("server reachable", err.message);
    line("");
    line("  Backend chal nahi raha. Pehle `npm run dev` karein.");
    line("");
    process.exit(1);
  }

  /* ---------------- 2. NoSQL injection ---------------- */
  line("");
  line("TEST: NoSQL injection (login bypass)");
  {
    const r = await post("/api/auth/login", {
      email: { $gt: "" },
      password: { $gt: "" },
    });

    const loggedIn = r.status === 200 && r.data?.success === true;

    if (loggedIn) {
      fail("injection blocked", "LOGIN BYPASS HO GAYA — sanitize kaam nahi kar raha");
    } else {
      pass("injection blocked", `status ${r.status}: ${r.data?.message}`);
      line("        (backend terminal me '[sanitize] ... dropped keys: $gt' dikhna chahiye)");
    }
  }

  /* ---------------- 3. Kamzor password ---------------- */
  line("");
  line("TEST: weak password rejected on signup");
  {
    const weak = ["12345678", "password", "abcdefgh"];
    let allRejected = true;

    for (const pw of weak) {
      const r = await post("/api/auth/signup", {
        name: "Test Weak",
        email: `weak.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.com`,
        password: pw,
      });
      const rejected = r.status === 400;
      if (!rejected) {
        allRejected = false;
        fail(`"${pw}" rejected`, `status ${r.status} — ACCOUNT BAN GAYA, delete karein`);
      } else {
        pass(`"${pw}" rejected`, r.data?.message);
      }
    }
    if (allRejected) line("        (koi account nahi bana — DB saaf hai)");
  }

  /* ---------------- 4. Admin role escalation ---------------- */
  line("");
  line("TEST: signup me role=admin bhejna");
  {
    const email = `roletest.${Date.now()}@example.com`;
    const r = await post("/api/auth/signup", {
      name: "Role Test",
      email,
      password: "Str0ngPass1",
      role: "admin",
    });

    const gotRole = r.data?.user?.role;

    if (r.data?.verificationRequired) {
      line(`  INFO  account bana (verification pending) — role response me nahi aata.`);
      line(`        Compass me ${email} dekh kar confirm karein: role "parent" hona chahiye, "admin" NAHI.`);
      line(`        Phir yeh test account delete kar dein.`);
    } else if (gotRole === "admin") {
      fail("role escalation blocked", "ADMIN BAN GAYA — bohat bara masla");
    } else {
      pass("role escalation blocked", `role = "${gotRole}" (admin nahi)`);
      line(`        Test account delete kar dein: ${email}`);
    }
  }

  /* ---------------- 5. Security headers (helmet) ---------------- */
  line("");
  line("TEST: security headers");
  {
    const res = await fetch(`${BASE}/api/health`);
    const checks = [
      ["x-content-type-options", "nosniff"],
      ["x-frame-options", null],
      ["x-dns-prefetch-control", null],
    ];

    for (const [name, expected] of checks) {
      const value = res.headers.get(name);
      if (!value) fail(name, "missing");
      else if (expected && value.toLowerCase() !== expected) fail(name, `= ${value}`);
      else pass(name, value);
    }

    const powered = res.headers.get("x-powered-by");
    if (powered) fail("x-powered-by hidden", `leak: ${powered}`);
    else pass("x-powered-by hidden");
  }

  /* ---------------- 6. Bare JSON body ---------------- */
  line("");
  line("TEST: oversized JSON body rejected");
  {
    const big = "x".repeat(200 * 1024); // 200kb, limit 100kb hai
    try {
      const r = await post("/api/auth/login", { email: big, password: big });
      if (r.status === 413) pass("413 Payload Too Large");
      else fail("oversized body rejected", `status ${r.status} (413 expected)`);
    } catch (err) {
      fail("oversized body rejected", err.message);
    }
  }

  line("");
  line("Done.");
  line("");
};

run().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
