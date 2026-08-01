require("dotenv").config();
const mongoose = require("mongoose");

const Category = require("../models/Category");
const User = require("../models/User");

/**
 * Seed script - database me shuruati data daalta hai.
 * Chalane ka tareeqa:  node utils/seed.js
 *
 * Ye script "safe" hai - agar cheez pehle se maujood ho to dobara nahi banati.
 * Chahe 10 baar chalayein, duplicate nahi banenge.
 */

const categories = [
  { name: "Art & Painting", icon: "palette", displayOrder: 1, isPopular: true },
  { name: "Pottery & Clay", icon: "pottery", displayOrder: 2, isPopular: true },
  { name: "Coding", icon: "laptop", displayOrder: 3, isPopular: true },
  { name: "Robotics", icon: "robot", displayOrder: 4, isPopular: true },
  { name: "Baking", icon: "cupcake", displayOrder: 5, isPopular: true },
  { name: "Chess", icon: "chess", displayOrder: 6, isPopular: true },
  { name: "Public Speaking", icon: "mic", displayOrder: 7, isPopular: false },
  { name: "STEM & Science", icon: "flask", displayOrder: 8, isPopular: true },
  { name: "Entrepreneurship", icon: "bulb", displayOrder: 9, isPopular: false },
  {
    name: "Quran & Islamic Studies",
    icon: "book",
    displayOrder: 10,
    isPopular: true,
  },
  { name: "Languages", icon: "globe", displayOrder: 11, isPopular: false },
  {
    name: "Sports & Fitness",
    icon: "ball",
    displayOrder: 12,
    isPopular: false,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB\n");

    /* ---------------------------- Categories ---------------------------- */
    let created = 0;
    let skipped = 0;

    for (const item of categories) {
      const exists = await Category.findOne({ name: item.name });

      if (exists) {
        skipped++;
        continue;
      }

      // create() ke bajaye new + save() - taake slug wala hook chale
      const category = new Category(item);
      await category.save();
      created++;
      console.log(`  + ${category.name}  (${category.slug})`);
    }

    console.log(
      `\n✓ Categories: ${created} created, ${skipped} already existed`,
    );

    /* ------------------------------- Admin ------------------------------ */
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log(
        "\n! Admin skipped - .env me ADMIN_EMAIL aur ADMIN_PASSWORD nahi mile",
      );
    } else {
      const adminExists = await User.findOne({
        email: adminEmail.toLowerCase(),
      });

      if (adminExists) {
        console.log(`\n✓ Admin already exists: ${adminEmail}`);
      } else {
        await User.create({
          name: "Kidventures Admin",
          email: adminEmail.toLowerCase(),
          password: adminPassword, // model me khud hash ho jayega
          role: "admin",
        });
        console.log(`\n✓ Admin created: ${adminEmail}`);
      }
    }

    console.log("\n✓ Seeding complete\n");
    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Seeding failed: ${error.message}\n`);
    process.exit(1);
  }
};

seed();
