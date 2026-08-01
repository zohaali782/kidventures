const Stripe = require("stripe");

/**
 * Stripe client. Secret key .env se aati hai - code me kabhi nahi.
 *
 * Test mode me "sk_test_..." key hoti hai - is se asli paise nahi
 * katate, sirf test card numbers chalte hain.
 */
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    "! STRIPE_SECRET_KEY .env me nahi mila - payments kaam nahi karengi",
  );
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || "");

module.exports = stripe;
