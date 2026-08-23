# Kidventures — Security Work Handover

> Yeh file ek security review ke baad likhi gayi hai. Naye chat me kaam jaari
> rakhna ho to yeh file Claude ko de dein — poora context is me hai.
>
> **Sab code changes ho chuke hain.** Baqi sirf setup ke 3 kaam aur testing hai.

---

## PEHLE YEH KAREIN (3 kaam)

### 1. Package install

```powershell
cd C:\Users\hp\kidventures\backend
npm install
```

### 2. `.env` me yeh lines

```
NODE_ENV=development
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
```

### 3. Stripe Dashboard me naya event enable karein

Developers → Webhooks → apna endpoint → Select events → **`charge.refunded`** add karein.

Iske baghair Stripe Dashboard se kiya gaya refund database me sync nahi hoga.

---

## KYA KYA BADLA — 4 batches

### Batch 1 — Authentication

| Masla | Ab kya hai |
|---|---|
| Rate limiting production me toota hua tha | `app.set("trust proxy", 1)` — har user ka apna IP |
| Token `localStorage` me (XSS = 30 din ka takeover) | httpOnly cookie — JavaScript pohanch hi nahi sakti |
| NoSQL injection ka bachao nahi | `middleware/sanitize.js` — request se `$` operators strip |
| JWT algorithm pin nahi, errors 500 ban rahe the | HS256 pin, ab 401 |
| Password badalne par purane tokens zinda | `passwordChangedAt` check |
| Galat env par server chal parta tha | Startup validation (MONGO_URI, JWT_SECRET, length) |
| Email verification nahi thi | Poora system — hashed token, 24hr expiry |
| Account lockout nahi tha | 5 attempts → 15 min lock |
| Password strength check nahi | Letter + number lazmi, common passwords block |
| bcrypt 10 rounds | 12 rounds |
| JSON body limit 5mb | 100kb |
| Email templates me HTML injection | Har value `esc()` se, `href` sirf apne domain ka |
| Paid booking cancel ho sakti thi (cron race) | Atomic conditional update |
| `seedActivities.js` me `"Test1234"` hardcoded | `.env` se aata hai |
| Seed scripts production par chal sakti thin | `utils/guardDevScript.js` |
| SMTP plaintext par fall back kar sakta tha | `requireTLS: true` + timeouts |
| Logs me poori email (PII) | Masked: `sa****@gmail.com` |
| Cron multiple instances par duplicate chalta | Sirf pehle worker par |

**Naye features:** email verification, forgot/reset password (hashed token, 1 ghanta expiry,
ek dafa chalta hai, reset par saare sessions marte hain, confirmation email).

### Batch 2 — Bookings & Payments

| Masla | Ab kya hai |
|---|---|
| Cancel ki hui booking late webhook se dobara "confirmed" ban jati thi → session oversold | Atomic — sirf `pending` booking confirm hoti hai. Warna Payment par `needsAttention: true` + loud log |
| `cancelBooking` lost-update race | Conditional `findOneAndUpdate`, warna 409 |
| Webhook processing se pehle 200 bhej deta tha | Pehle kaam, phir 200. Error par 500 → Stripe retry karta hai |
| Refund amount `NaN` dono bounds checks paar kar jata tha | `Number.isFinite` check |
| Do refund ek sath = double refund | Stripe call se pehle atomically `totalRefunded` reserve, fail par rollback |
| Instructor `?status=pending` se unpaid bookings (bachon ke naam + allergies) dekh sakta tha | Status whitelist |
| Stripe Dashboard se refund → DB ko khabar nahi | `charge.refunded` webhook |
| `displayPrice` ka jaal (frontend use tarjeeh deta tha, schema me tha hi nahi) | Frontend se hataya — sirf `activity.price` |

**Refund policy code me aa gayi** (client ki di hui, Refund Policy page wali):

| Class se pehle | Tier |
|---|---|
| 48 ghante se zyada | `full` |
| 24–48 ghante | `partial` — admin faisla karta hai |
| 24 ghante se kam | `none` |

Pehle code sirf ek shart lagata tha (24+ ghante = poora refund).

**Naye features:** Parent Dashboard me **Cancel booking** button (tier ke sath rang wala
confirm modal), Admin Dashboard me **Refunds** tab (pending refund queue, 48h+ intezar par
lal, Refund / Mark done / No refund buttons, audit trail).

> **Commission model badla NAHI gaya.** Instructor price rakhta hai, parent wohi deta hai,
> 15% instructor ki earning se katta hai. Site ka apna text bhi yehi kehta hai.

### Batch 3 — Uploads & Activities

| Masla | Ab kya hai |
|---|---|
| **`images` `EDITABLE_FIELDS` me tha** → instructor A doosre ki image ka `publicId` apni class me daal kar Cloudinary se delete kar sakta tha | Hataya. Sath me `deleteActivityImage` par folder-prefix check |
| **Approved class bina dobara review ke badli ja sakti thi** | Maadi tabdeeli par status wapas `pending` |
| `videoUrl` ki koi jaanch nahi | `utils/safeUrl.js` — sirf https YouTube/Vimeo |
| Upload me magic-byte check nahi | `verifyImage` / `verifyDocument` middleware |
| `?minPrice=abc` → 500 | Nazarandaz ho jata hai |
| Search query unbounded | 80 characters cap |

### Batch 4 — Reviews, Children, Instructor profile

| Masla | Ab kya hai |
|---|---|
| **LIVE BUG: class rating hamesha 0** — aggregation me string ObjectId se match nahi karti thi | `toObjectId()` conversion |
| Bina class attend kiye review likha ja sakta tha | `sessionDate` guzri hui honi chahiye |
| `Number("abc")` rating dono checks paar kar jati thi | `Number.isInteger` check |
| Parent bachay ki DOB badal kar age-range bypass kar sakta tha | Update par bhi DOB validation |
| `gallery` `EDITABLE_FIELDS` me tha | Hataya — sirf upload endpoint se |
| `introVideoUrl` ki jaanch nahi | Same validator |
| Ghalat ObjectId par 500 | Saaf 400/404 |

---

## TEST PLAN

Backend aur frontend dono chalayein, phir yeh tarteeb se:

### A. Auth

- [ ] Signup — password `12345678` reject hona chahiye, `Test1234` chalna chahiye
- [ ] SMTP set hai to verification email aati hai; link click kiye baghair **login nahi hota**
- [ ] Link click → login page par "Email confirmed!"
- [ ] Login → F12 → Application → Cookies → filter `kv_token` → **HttpOnly ✓**
- [ ] Console: `localStorage.getItem("kv_token")` → **`null`**
- [ ] Logout → cookie gayab, `/parent/dashboard` login par bhejta hai
- [ ] Cookie manually delete → refresh → "Your session expired"
- [ ] Galat password 5 dafa → "Too many failed attempts. Try again in 15 minute(s)."
- [ ] Forgot password → email → naya password → login

### B. Backend security (script se)

```powershell
cd C:\Users\hp\kidventures
node security-test.js
```

- [ ] Sab PASS. Backend terminal me `[sanitize] ... dropped keys: $gt` aana chahiye

### C. Bookings & Payments

- [ ] Booking → payment (test card `4242 4242 4242 4242`) → `confirmed`
- [ ] Parent Dashboard → Upcoming → **Cancel** → modal me sahi tier
      (48h+ = green full, 24–48h = amber partial, <24h = grey none)
- [ ] Cancel ke baad seat free ho jati hai
- [ ] Admin → **Refunds** tab → wahi booking nazar aaye
- [ ] **Refund** → Stripe par paisa wapas → list se gayab
- [ ] Stripe Dashboard se seedha refund → backend terminal:
      `✓ Refund synced from Stripe: KV-... (full)`

### D. Uploads & Activities

- [ ] `.txt` file ka naam `photo.jpg` karke upload → *"That file doesn't look like a real image or PDF"*
- [ ] Approved (live) class ka title badlein → response me `sentBackForReview: true`,
      class `/activities` par dikhni band
- [ ] Class edit me `videoUrl` = `https://evil.com/x` → 400

### E. Reviews

- [ ] Guzri hui class par review → rating class par lagti hai (**pehle hamesha 0 hoti thi**)
- [ ] Aane wali class par review → *"You can leave a review once the class has taken place"*

### F. Aakhir me

- [ ] Poori site ghoom kar dekhein, console me koi red error na ho
- [ ] `git add -A && git commit -m "security hardening"`

---

## ABHI BHI KHULA HUA HAI

1. **`.env` git history me hai ya nahi** — abhi tak check nahi hua:
   ```powershell
   git log --all --oneline -- backend/.env frontend/.env .env
   ```
   Khali output = theek. Kuch aaye = MongoDB password, JWT_SECRET, Stripe keys,
   SMTP password — sab rotate karne parenge.

2. **`.env` screenshot me expose hui thi** (MongoDB URI + JWT_SECRET). In dono ko
   rotate karna abhi baqi hai.

3. **Approved instructor apna profile bina dobara review ke badal sakta hai** —
   bio, headline, categories, location. Classes wala fix ho chuka hai, profile wala
   nahi. Meri raye: admin ko kam az kam nazar aana chahiye ke approval ke baad profile
   badla hai.

4. **`title`/`description` par koi text index nahi** — har search poori collection
   scan karti hai. Abhi data kam hai, badhne par masla banega.

5. **Instructor payout ka koi system nahi** — `payoutStatus` field hai magar
   koi flow nahi.

6. **Temporary files delete kar dein** jab testing mukammal ho jaye:
   `security-test.js`, `backend/fix-old-users.js`, `backend/cleanup.js`

---

## KAAM KI FILES

**Nayi files (is review me bani):**

- `backend/utils/authCookie.js` — httpOnly cookie set/clear
- `backend/utils/guardDevScript.js` — seed scripts ko production se rokta hai
- `backend/utils/safeUrl.js` — video/https URL validation
- `backend/middleware/sanitize.js` — NoSQL injection se bachao
- `frontend/src/pages/ForgotPasswordPage.jsx`
- `frontend/src/pages/ResetPasswordPage.jsx`

**Helper scripts (baad me delete kar dein):**

- `security-test.js` — 6 backend security tests
- `backend/fix-old-users.js` — purane accounts ko `emailVerified` deta hai
- `backend/cleanup.js` — locks hatata hai, test accounts delete karta hai

---

## SETUP ME AKSAR HONE WALI GHALTIYAN

- **PowerShell me `node -e "...$set..."` mat likhein** — woh `$set` ko apna variable
  samajh leti hai. Aisi har cheez ke liye chhoti `.js` file bana lein.
- **`NODE_ENV=production node script.js` Mac/Linux ka syntax hai.** PowerShell me:
  `$env:NODE_ENV="production"; node script.js; Remove-Item Env:NODE_ENV`
- **Do alag terminals rakhein** — ek me backend chalta rahe, doosre me commands.
- **VS Code me purani tab khuli ho to `Ctrl+S` se changes mit sakti hain.**
  Shak ho to saari tabs band karke dobara kholein.
