# Kidventures — Security Fixes Checklist

> Sab code changes **pehle se ho chuke hain**. Yeh file un cheezon ke liye hai jo
> aap ko khud karni hain (install, .env, database) aur har cheez ka test.
>
> Har step ke `- [ ]` ko `- [x]` kar ke tick karti jayein.

---

## 📁 Pehle yeh jaan lein — kaun si files badli hain

### Nayi files (maine banayi hain, aap ko banane ki zaroorat nahi)

| File | Kaam |
|---|---|
| `backend/utils/authCookie.js` | httpOnly cookie set/clear karne ka logic |
| `backend/utils/guardDevScript.js` | Seed scripts ko production par chalne se rokta hai |
| `backend/middleware/sanitize.js` | User ki body/query se Mongo operators (`$gt` waghera) hata deta hai |

### Badli hui files — Backend

- `backend/server.js`
- `backend/models/User.js`
- `backend/middleware/auth.js`
- `backend/controllers/authController.js`
- `backend/routes/authRoutes.js`
- `backend/package.json`
- `backend/utils/emailTemplates.js`
- `backend/utils/sendEmail.js`
- `backend/utils/releaseExpiredReservations.js`
- `backend/utils/seed.js`
- `backend/utils/seedActivities.js`
- `backend/utils/addSessions.js`

### Badli hui files — Frontend

- `frontend/src/api/axios.js`
- `frontend/src/api/auth.js`
- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/SignupPage.jsx`

**Aap ko koi nayi file nahi banani.** Sirf `.env` mein lines add karni hain (Step 2).

---

## STEP 0 — Backup

Kuch bhi karne se pehle, taake kharabi ho to wapas jaya ja sake.

- [ ] Project folder mein terminal khol kar:

```bash
git add -A
git commit -m "before security fixes"
```

- [ ] Agar git use nahi karti, to poora `kidventures` folder copy kar ke kahin aur paste kar dein.

---

## STEP 1 — Package install

- [ ] Backend folder mein:

```bash
cd backend
npm install
```

`package.json` mein `cookie-parser` add kar diya hai aur `@stripe/react-stripe-js`,
`@stripe/stripe-js` (jo galti se backend mein aa gaye the) hata diye hain —
`npm install` dono kaam kar dega.

### ✅ Test

- [ ] Yeh chala kar dekhein, koi error nahi aana chahiye:

```bash
node -e "require('cookie-parser'); console.log('cookie-parser OK')"
```

Expected output: `cookie-parser OK`

---

## STEP 2 — `.env` mein variables add karein

- [ ] `backend/.env` file kholein aur yeh lines add karein (jo pehle se hain, unhein chhor dein):

**Add karein:**

```
NODE_ENV=development
SERVER_URL=http://localhost:5000
```

**Badlein** — aap ki file mein `JWT_EXPIRE=30d` hai, use `7d` kar dein:

```
JWT_EXPIRE=7d
```

**Baqi sab pehle se theek hain** — `PORT`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLOUDINARY_*`, `STRIPE_*`, `SMTP_*`, `EMAIL_FROM`,
`FRONTEND_URL`. Inhein haath na lagayein.

> `TEST_INSTRUCTOR_PASSWORD` ki zaroorat nahi — woh sirf `seedActivities.js`
> (fake demo classes) ke liye tha, jo hum nahi chala rahe.

**`JWT_SECRET` check karein** — agar woh 32 characters se chhota hai to naya bana lein:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

- [ ] Naya secret `.env` ke `JWT_SECRET=` mein paste kar dein.

> ⚠️ `.env` file kabhi kisi ko na bhejein aur na hi git par push karein.
> Aap ki `.gitignore` mein woh pehle se hai — theek hai.

### ✅ Test

- [ ] Server start karein:

```bash
npm run dev
```

Expected:
```
MongoDB connected successfully
Server running on port 5000
```

Agar `FATAL: ... is not set` aaye → woh variable `.env` mein missing hai.
Agar `WARNING: JWT_SECRET is shorter than 32 characters` aaye → naya secret banayein.

---

## STEP 3 — Purane test users delete karein

**Yeh zaroori hai.** Purane users ke passwords 10 bcrypt rounds par hain aur
un ka `emailVerified` field hai hi nahi — woh login nahi kar payenge.

- [ ] MongoDB Compass ya Atlas kholein
- [ ] Apna database → `users` collection
- [ ] Saare documents delete kar dein (collection khali kar dein)

- [ ] **Agar** aap ne pehle kabhi `seedActivities.js` chalayi thi (Compass mein
      `activities` collection mein "Little Picasso" / "Chess Masterminds" jaisi
      classes nazar aayen), to woh collection bhi khali kar dein — un ka instructor
      ab maujood nahi hoga aur classes toot jayengi.

Terminal se dono ek sath (backend folder mein):

```bash
node -e "require('dotenv').config();const m=require('mongoose');m.connect(process.env.MONGO_URI).then(async()=>{const u=await m.connection.collection('users').deleteMany({});const a=await m.connection.collection('activities').deleteMany({});console.log('users:',u.deletedCount,'activities:',a.deletedCount);process.exit(0)})"
```

- [ ] Phir categories aur admin dobara banayein:

```bash
node utils/seed.js
```

> **`node utils/seedActivities.js` NAHI chalani.** Woh 10 fake demo classes banati hai.
> Aap khud apna instructor aur parent account bana kar test karengi.
>
> `seed.js` zaroori hai — woh categories (Art & Painting, Coding, Chess...) banati hai,
> jin ke baghair instructor class create hi nahi kar sakega.

### ✅ Test

- [ ] Output mein `✓ Categories: 12 created` aur `✓ Admin created: <aap ki email>` aaye
- [ ] Compass mein admin user dekh kar confirm karein: `emailVerified: true`, `role: "admin"`

---

## STEP 4 — Seed script ka production guard test

- [ ] Yeh chala kar dekhein (yeh **fail** hona chahiye — yehi test hai).

**Aap PowerShell use kar rahi hain**, to yeh wali line chalayein:

```powershell
$env:NODE_ENV="production"; node utils/seed.js; Remove-Item Env:NODE_ENV
```

> `NODE_ENV=production node utils/seed.js` wala tareeqa sirf Mac/Linux ka hai.
> PowerShell mein woh error deta hai: *"is not recognized as the name of a cmdlet"*.

### ✅ Expected

```
✗ seed.js production me nahi chal sakti.
```

Agar yeh message aaya to guard kaam kar raha hai. ✔
(Aakhir mein `NODE_ENV` wapas `development` karna na bhoolein.)

---

## STEP 5 — Frontend start karein

- [ ] Naya terminal:

```bash
cd frontend
npm run dev
```

### ✅ Test

- [ ] Browser mein site khul jaye, koi red error console mein na ho

---

## STEP 6 — Signup test

- [ ] `/signup` par jayein aur naya parent account banayein
- [ ] Password mein pehle **`12345678`** try karein

### ✅ Expected

- [ ] Error aana chahiye: *"Password must contain at least one letter and one number"*
- [ ] Ab `Test1234` jaisa password dein → account ban jaye

**Agar `.env` mein SMTP set hai:**
- [ ] Login page par redirect hoga aur message aayega: *"Almost done — we've emailed you a confirmation link..."*
- [ ] Apni email check karein, link par click karein
- [ ] Login page par `Email confirmed! You can log in now.` dikhna chahiye

**Agar SMTP set nahi hai (normal development):**
- [ ] Seedha dashboard par pohanch jayein — yeh sahi hai, dev mein verification skip hoti hai

---

## STEP 7 — Cookie test (sab se ahem test) 🔑

- [ ] Login karein
- [ ] Browser mein **F12** dabayein → **Application** tab → left side **Cookies** → `http://localhost:5173`

### ✅ Expected

- [ ] `kv_token` naam ki cookie nazar aaye
- [ ] Us ke `HttpOnly` column mein **✓ / true** ho

Ab **Console** tab par jayein aur yeh likh kar Enter dabayein:

```js
localStorage.getItem("kv_token")
```

### ✅ Expected

```
null
```

**Agar `null` aaya — yeh sab se bara fix kaam kar raha hai.** Token ab JavaScript
ki pohanch se bahar hai, yaani XSS ho bhi jaye to session chori nahi ho sakta.

Agar token ki lambi string aayi → kuch galat hai, mujhe batayein.

---

## STEP 8 — Logout test

- [ ] Navbar se logout karein

### ✅ Expected

- [ ] Homepage par wapas aa jayein
- [ ] F12 → Application → Cookies mein `kv_token` **gayab** ho jaye
- [ ] Ab `/parent/dashboard` URL manually type karein → login page par bhej de

---

## STEP 9 — Account lockout test 🔒

- [ ] Login page par apni email daalein aur **galat password** 5 dafa daalein

### ✅ Expected

- [ ] Pehle 4 dafa: *"Invalid email or password"*
- [ ] 5th ke baad: *"Too many failed attempts. Try again in 15 minute(s)."*
- [ ] Ab **sahi** password bhi kaam nahi karega — 15 min lock hai

> Lock hatane ke liye Compass mein us user ka `lockedUntil` field delete kar dein,
> ya 15 minute intezar karein.

- [ ] Test ke baad lock hata kar login kar ke confirm karein ke normal login chalta hai

---

## STEP 10 — Session expiry test

- [ ] Login karein, dashboard khol lein
- [ ] F12 → Application → Cookies → `kv_token` par right-click → **Delete**
- [ ] Page par koi bhi action karein (refresh, ya koi data load karne wala button)

### ✅ Expected

- [ ] Automatically login page par chala jaye
- [ ] Upar message: *"Your session expired. Please log in again."*

---

## STEP 11 — NoSQL injection test 💉

- [ ] Login page par email ki jagah yeh daalein: `{"$gt":""}` aur koi bhi password

### ✅ Expected

- [ ] *"Invalid email or password"* aaye
- [ ] **500 server error nahi** aana chahiye
- [ ] Login **na** ho

> Note: frontend ki apni validation `{"$gt":""}` ko "Enter a valid email" keh kar
> pehle hi rok deti hai — request backend tak jati hi nahi. Yeh acha hai (do layer
> ka bachao), lekin backend ka test isse nahi hota. Us ke liye neeche wali script hai.

### Backend ke tests — `security-test.js`

Backend chalta rehne dein, naya terminal:

```powershell
cd C:\Users\hp\kidventures
node security-test.js
```

Yeh 6 cheezein ek sath test karti hai:

- [ ] NoSQL injection (login bypass) — blocked
- [ ] Kamzor passwords (`12345678`, `password`, `abcdefgh`) — rejected
- [ ] Signup me `role: "admin"` — parent hi banta hai
- [ ] Security headers (nosniff, X-Frame-Options, X-Powered-By hidden)
- [ ] 200kb JSON body — 413 reject
- [ ] Server reachable

Chalate waqt **backend terminal par nazar rakhein** — wahan yeh line aani chahiye:

```
[sanitize] POST /api/auth/login — dropped keys: $gt, $gt
```

- [ ] Role test ka account Compass me check karein (`role: "parent"` hona chahiye), phir delete kar dein
- [ ] Sab test ho jane ke baad `security-test.js` file delete kar dein

> PowerShell se `curl` / `Invoke-RestMethod` mat use karein — us ki quoting JSON
> tor deti hai aur test galat nateeja deta hai.

---

## STEP 12 — Email template injection test 📧

Yeh woh hole tha jis se instructor parents ko phishing link bhej sakta tha.

- [ ] Apna instructor account banayein, admin se approve karein, phir class banayein
- [ ] Class ka title yeh rakhein:

```
Test Class</td></tr><tr><td><a href="https://evil.com">Click here</a>
```

- [ ] Us class ki ek booking karein taake confirmation email jaye

### ✅ Expected

- [ ] Email mein woh poora text **plain text ki tarah** dikhe
- [ ] Koi "Click here" wala clickable link **na bane**

> SMTP set nahi hai to yeh test skip kar dein — code-level par verify kar chuka hoon.

---

## STEP 13 — Booking cancel race ka test (optional, thora technical)

Yeh cron test karna mushkil hai. Kam az kam yeh confirm kar lein:

- [ ] Server chalne par har 2 minute baad terminal mein cleanup ki koi error na aaye
- [ ] Agar koi booking expire ho to log mein aisa aaye:
      `✓ Reservations: 1 released, 0 skipped (already paid/handled)`

---

## STEP 14 — Aakhri check

- [ ] Poori site ghoom kar dekh lein: homepage, activities, activity detail,
      parent dashboard, instructor dashboard, admin panel
- [ ] Browser console mein koi red error na ho
- [ ] Sab kuch chalne ke baad commit kar dein:

```bash
git add -A
git commit -m "security: httpOnly cookie auth, email verification, account lockout, email injection fix"
```

---

## 🔴 Ek cheez jo aap ko khud check karni hai

Aap ki `.gitignore` mein `.env` to hai, lekin kya woh **shuru se** tha?
Agar kabhi `.env` commit ho gayi thi to woh git history mein hamesha ke liye
mehfooz hai — chahe ab file gitignore mein ho.

- [ ] Project root mein chalayein:

```bash
git log --all --oneline -- backend/.env frontend/.env .env
```

**Khali output** = sab theek ✔

**Kuch commits nazar aayen** = yeh secrets rotate karne parenge:
- [ ] MongoDB ka password (Atlas → Database Access)
- [ ] `JWT_SECRET` (naya banayein)
- [ ] Stripe keys (Stripe dashboard → roll keys)
- [ ] SMTP password

---

## 📋 Kya fix hua — chhota khulasa

| # | Masla | Ab kya hai |
|---|---|---|
| 1 | Rate limiting production mein toota hua | `trust proxy` set — har user ka apna IP count |
| 2 | Token `localStorage` mein (XSS = 30 din ka takeover) | httpOnly cookie — JavaScript pohanch hi nahi sakti |
| 3 | NoSQL injection ka koi bachao nahi | `mongoose.set("sanitizeFilter")` |
| 4 | JWT algorithm pin nahi, errors 500 ban rahe the | HS256 pin, ab 401 |
| 5 | Password badalne par purane tokens zinda | `passwordChangedAt` check |
| 6 | Galat env par server chal parta tha | Startup validation |
| 7 | Email verification nahi thi | Poora system — hashed token, 24hr expiry |
| 8 | Account lockout nahi tha | 5 attempts → 15 min lock |
| 9 | Password strength check nahi | Letter + number lazmi, common passwords block |
| 10 | Email templates mein HTML injection | Har value `esc()` se, `href` sirf apne domain ka |
| 11 | Paid booking cancel ho sakti thi | Atomic conditional update |
| 12 | `seedActivities.js` mein `"Test1234"` hardcoded | `.env` se aata hai |
| 13 | Seed scripts production par chal sakti thin | `guardDevScript` |
| 14 | SMTP plaintext par fall back kar sakta tha | `requireTLS: true` |
| 15 | Logs mein poori email (PII) | Masked: `sa****@gmail.com` |
| 16 | bcrypt 10 rounds | 12 rounds |
| 17 | JSON body limit 5mb | 100kb |
| 18 | Cron multiple instances par duplicate chalta | Sirf pehle worker par |

---

## ⏭️ Abhi baqi hai

- [ ] **Forgot / reset password** — yeh feature aap ke paas hai hi nahi. Ab email
      verification ka pattern ban gaya hai, isi par bana denge.
- [ ] **Batch 2 — Payments & Bookings** — `bookingController.js`, `paymentController.js`
      (Stripe webhook), `models/Booking.js`. Yahan check karna hai ke price server par
      calculate hoti hai ya client se aati hai, webhook signature verify hoti hai ya nahi,
      aur koi doosre parent ki booking (bachon ke naam, allergy notes) to nahi dekh sakta.
- [ ] **Batch 3 — Input validation** — activity filters, uploads, admin routes.
