// Shared instructor mock data — used by the Instructor Profile Page (and later the instructors listing).
// When the backend is ready (Day 9-11), this gets replaced by a real API call.
// NOTE: private documents (Emirates ID, trade licence, certificate files) are NEVER stored or shown here —
// those live in the admin verification area only. This file holds only public-facing profile info.

const instructors = [
  {
    id: 1,
    name: "Sarah Ahmed",
    verified: true,
    subject: "Art & Painting",
    tagline: "Ceramics & pottery specialist for kids",
    rating: 4.9,
    reviews: 56,
    studentsTaught: "120+",
    classesCompleted: 340,
    joinedDate: "Jan 2023",
    gallery: ["\uD83C\uDFA8", "\uD83C\uDFFA", "\uD83D\uDD8C\uFE0F", "\u2728"],
    experience: "6+",
    location: "Mirdif, Dubai",
    languages: ["English", "Arabic"],
    bio: "Passionate ceramic artist and kids workshop instructor with over 6 years of experience. I love helping children discover their creativity through hands-on clay and pottery work in a safe, encouraging environment.",
    qualifications: [
      "Diploma in Fine Arts",
      "Certified Kids Art Educator",
      "First Aid Certified",
    ],
    activityIds: [1, 7], // classes taught by this instructor (match activities.js ids)
    reviewList: [
      {
        parent: "Aisha K.",
        rating: 5,
        text: "My daughter loved every minute. Sarah is patient and kind!",
      },
      {
        parent: "Omar H.",
        rating: 5,
        text: "Wonderful class, very well organized. Highly recommend.",
      },
      {
        parent: "Fatima B.",
        rating: 4,
        text: "Great experience, my son can't wait for the next session.",
      },
    ],
  },
  {
    id: 2,
    name: "Omar Hassan",
    verified: true,
    subject: "Robotics & Coding",
    tagline: "Making STEM fun and hands-on",
    rating: 4.9,
    reviews: 42,
    studentsTaught: "200+",
    classesCompleted: 210,
    joinedDate: "Mar 2023",
    gallery: ["\uD83E\uDD16", "\u2699\uFE0F", "\uD83D\uDCBB", "\uD83D\uDD27"],
    experience: "6+",
    location: "Dubai Silicon Oasis",
    languages: ["English"],
    bio: "Robotics educator introducing kids to STEM through hands-on building and beginner-friendly coding. I believe every child can be an engineer with the right encouragement.",
    qualifications: [
      "BSc Computer Engineering",
      "Certified STEM Instructor",
      "First Aid Certified",
    ],
    activityIds: [4],
    reviewList: [
      {
        parent: "Sara A.",
        rating: 5,
        text: "My son built his first robot and was so proud!",
      },
      {
        parent: "Hana M.",
        rating: 5,
        text: "Omar explains things so clearly. Fantastic teacher.",
      },
    ],
  },
  {
    id: 3,
    name: "Aisha Rahman",
    verified: true,
    subject: "Pottery & Clay",
    tagline: "Creative clay sessions for little hands",
    rating: 4.8,
    reviews: 31,
    studentsTaught: "90+",
    classesCompleted: 150,
    joinedDate: "Jun 2023",
    gallery: ["\uD83C\uDFFA", "\uD83E\uDD5A", "\uD83C\uDFA8", "\u2728"],
    experience: "7+",
    location: "Al Barsha, Dubai",
    languages: ["English", "Arabic"],
    bio: "Experienced pottery and clay artist who loves teaching kids handcrafts. My sessions focus on patience, focus, and the joy of making something with your own hands.",
    qualifications: [
      "Diploma in Ceramics",
      "Certified Art Therapist",
      "First Aid Certified",
    ],
    activityIds: [2],
    reviewList: [
      {
        parent: "Layla R.",
        rating: 5,
        text: "Such a calming, creative class. My daughter adores Aisha.",
      },
      {
        parent: "Yusuf K.",
        rating: 4,
        text: "Good class and friendly instructor.",
      },
    ],
  },
];

export default instructors;
