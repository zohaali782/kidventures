require("dotenv").config();
const mongoose = require("mongoose");

const Activity = require("../models/Activity");
const Category = require("../models/Category");
const User = require("../models/User");

/**
 * TEST DATA seed - sirf development/testing ke liye.
 * Chalane ka tareeqa:  node utils/seedActivities.js
 *
 * Ye ~10 active classes daalta hai (alag category, price, age, area, online/in-person)
 * taake /activities pe filters, sort aur pagination test ho sakein.
 * Idempotent hai: same title pehle se ho to skip.
 *
 * NOTE: agar kisi field ki wajah se "validation failed" aaye, to niche console me
 * saaf likha aayega ke kaunsa field - phir Activity.js bhej dena, adjust kar denge.
 */

// har class ka data. category -> category ka NAAM (niche id me badal denge).
const CLASSES = [
  {
    title: "Little Picasso — Kids Painting",
    category: "Art & Painting",
    description:
      "A joyful introduction to colours, brushes and creativity where children paint their own masterpieces each week.",
    ageMin: 5,
    ageMax: 9,
    price: 90,
    area: "Jumeirah",
    format: "in-person",
    rating: 4.8,
    ratingCount: 24,
    bookings: 30,
    featured: true,
  },
  {
    title: "Pottery Wheel for Beginners",
    category: "Pottery & Clay",
    description:
      "Hands-on clay and wheel-throwing basics. Kids make bowls and cups and take home their fired creations.",
    ageMin: 7,
    ageMax: 12,
    price: 120,
    area: "Mirdif",
    format: "in-person",
    rating: 4.6,
    ratingCount: 15,
    bookings: 18,
    featured: true,
  },
  {
    title: "Scratch Coding Adventures",
    category: "Coding",
    description:
      "Learn to build games and animations with Scratch. A fun, screen-smart intro to logical thinking and coding.",
    ageMin: 8,
    ageMax: 13,
    price: 150,
    area: "Dubai Silicon Oasis",
    format: "online",
    rating: 4.9,
    ratingCount: 41,
    bookings: 52,
    featured: false,
  },
  {
    title: "LEGO Robotics Lab",
    category: "Robotics",
    description:
      "Build and program robots using LEGO kits. Teamwork, engineering and problem-solving in every session.",
    ageMin: 9,
    ageMax: 14,
    price: 220,
    area: "Al Barsha",
    format: "in-person",
    rating: 4.7,
    ratingCount: 19,
    bookings: 22,
    featured: true,
  },
  {
    title: "Junior Baking Studio",
    category: "Baking",
    description:
      "Cupcakes, cookies and cake pops! Kids learn measuring, mixing and decorating in a safe, fun kitchen.",
    ageMin: 6,
    ageMax: 11,
    price: 95,
    area: "Motor City",
    format: "in-person",
    rating: 4.5,
    ratingCount: 12,
    bookings: 14,
    featured: false,
  },
  {
    title: "Chess Masterminds",
    category: "Chess",
    description:
      "From first moves to winning strategies. Builds focus, patience and critical thinking through chess.",
    ageMin: 6,
    ageMax: 16,
    price: 80,
    area: "Jumeirah",
    format: "in-person",
    rating: 4.8,
    ratingCount: 33,
    bookings: 40,
    featured: false,
  },
  {
    title: "Confident Speakers Club",
    category: "Public Speaking",
    description:
      "Public speaking and drama games that grow confidence, clear speech and stage presence.",
    ageMin: 10,
    ageMax: 15,
    price: 130,
    area: "Al Quoz",
    format: "online",
    rating: 4.4,
    ratingCount: 9,
    bookings: 11,
    featured: false,
  },
  {
    title: "Young Scientists STEM Lab",
    category: "STEM & Science",
    description:
      "Exciting hands-on experiments across chemistry, physics and biology. Curiosity-driven discovery every week.",
    ageMin: 7,
    ageMax: 12,
    price: 175,
    area: "Mirdif",
    format: "in-person",
    rating: 4.9,
    ratingCount: 27,
    bookings: 35,
    featured: true,
  },
  {
    title: "Arabic for Kids",
    category: "Languages",
    description:
      "A playful, immersive Arabic programme building reading, writing and everyday conversation.",
    ageMin: 5,
    ageMax: 10,
    price: 110,
    area: "Al Barsha",
    format: "in-person",
    rating: 4.6,
    ratingCount: 14,
    bookings: 16,
    featured: false,
  },
  {
    title: "Little Champions Football",
    category: "Sports & Fitness",
    description:
      "Fun football coaching focused on fitness, coordination and teamwork for energetic young players.",
    ageMin: 6,
    ageMax: 12,
    price: 70,
    area: "Motor City",
    format: "in-person",
    rating: 4.7,
    ratingCount: 21,
    bookings: 28,
    featured: false,
  },
];

// aaj se N din baad ki date
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB\n");

    /* ------- category naam -> id map ------- */
    const cats = await Category.find({});
    const catByName = {};
    cats.forEach((c) => (catByName[c.name] = c._id));

    if (cats.length === 0) {
      console.log("! No categories found. Run `node utils/seed.js` first.\n");
      process.exit(1);
    }

    /* ------- ek instructor dhoondo (ya bana do) ------- */
    let instructor = await User.findOne({ role: "instructor" });
    if (!instructor) {
      instructor = await User.create({
        name: "Test Instructor",
        email: "test.instructor@kidventures.local",
        password: "Test1234",
        role: "instructor",
      });
      console.log(`+ Created test instructor: ${instructor.email}`);
    } else {
      console.log(`✓ Using existing instructor: ${instructor.name}`);
    }
    console.log("");

    /* ------- classes daalo ------- */
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const c of CLASSES) {
      const exists = await Activity.findOne({ title: c.title });
      if (exists) {
        skipped++;
        continue;
      }

      const categoryId = catByName[c.category];
      if (!categoryId) {
        console.log(
          `  ! Skipped "${c.title}" — category "${c.category}" not found`,
        );
        skipped++;
        continue;
      }

      const data = {
        title: c.title,
        description: c.description,
        whatChildrenLearn: [
          "Build core skills step by step",
          "Have fun and grow confidence",
        ],
        category: categoryId,
        instructor: instructor._id,
        ageMin: c.ageMin,
        ageMax: c.ageMax,
        price: c.price,
        displayPrice: Math.round(c.price * 1.15), // parent-facing (15% commission)
        durationMinutes: 60,
        format: c.format,
        languages: ["English"],
        location:
          c.format === "online"
            ? { area: "", address: "Online session" }
            : { area: c.area, address: `${c.area}, Dubai` },
        capacity: 12,
        materialsIncluded: true,
        materialsNote: "All materials provided.",
        whatToBring: "Just enthusiasm!",
        cancellationPolicy:
          "Free cancellation up to 24 hours before the class.",
        status: "active",
        isFeatured: !!c.featured,
        rating: { average: c.rating, count: c.ratingCount },
        stats: { totalBookings: c.bookings, viewCount: c.bookings * 3 },
        sessions: [
          {
            date: daysFromNow(7),
            startTime: "10:00",
            endTime: "11:00",
            capacity: 12,
            seatsBooked: 0,
          },
          {
            date: daysFromNow(14),
            startTime: "10:00",
            endTime: "11:00",
            capacity: 12,
            seatsBooked: 0,
          },
        ],
      };

      try {
        const activity = new Activity(data);
        await activity.save();
        created++;
        console.log(`  + ${c.title}  (AED ${c.price}, ${c.format})`);
      } catch (err) {
        failed++;
        console.log(`  ✗ ${c.title} — ${err.message}`);
      }
    }

    console.log(
      `\n✓ Activities: ${created} created, ${skipped} skipped, ${failed} failed\n`,
    );
    if (failed > 0) {
      console.log(
        "  Kuch classes validation pe fail huin — upar wala error dekho, ya Activity.js bhej do.\n",
      );
    }
    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Seeding failed: ${error.message}\n`);
    process.exit(1);
  }
};

seed();
