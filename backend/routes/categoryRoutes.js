const express = require("express");
const router = express.Router();

const {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const { protect, authorize } = require("../middleware/auth");

/**
 * PUBLIC - koi bhi dekh sakta hai (homepage, filters)
 */
router.get("/", getCategories);
router.get("/:slug", getCategoryBySlug);

/**
 * ADMIN ONLY - "protect" token check karta hai,
 * "authorize('admin')" check karta hai ke role admin hai.
 * Ek instructor ya parent ye routes chala hi nahi sakta.
 */
router.post("/", protect, authorize("admin"), createCategory);
router.put("/:id", protect, authorize("admin"), updateCategory);
router.delete("/:id", protect, authorize("admin"), deleteCategory);

module.exports = router;
