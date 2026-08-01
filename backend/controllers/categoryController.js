const Category = require("../models/Category");

/**
 * @desc    Sab active categories - homepage aur filters ke liye
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = async (req, res, next) => {
  try {
    // Admin chahe to inactive bhi dekh sakta hai: /api/categories?all=true
    const showAll = req.query.all === "true" && req.user?.role === "admin";
    const filter = showAll ? {} : { isActive: true };

    const categories = await Category.find(filter).sort({
      displayOrder: 1,
      name: 1,
    });

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ek category (slug se) - category page ke liye
 * @route   GET /api/categories/:slug
 * @access  Public
 */
const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Nayi category banana
 * @route   POST /api/categories
 * @access  Admin only
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, description, icon, displayOrder, isPopular } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    const exists = await Category.findOne({ name: name.trim() });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "This category already exists" });
    }

    const category = await Category.create({
      name: name.trim(),
      description,
      icon,
      displayOrder: displayOrder || 0,
      isPopular: !!isPopular,
    });

    res
      .status(201)
      .json({ success: true, message: "Category created", category });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Category update karna
 * @route   PUT /api/categories/:id
 * @access  Admin only
 */
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // Sirf ye fields update ho sakti hain - baqi ignore
    const allowed = [
      "name",
      "description",
      "icon",
      "displayOrder",
      "isPopular",
      "isActive",
    ];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) category[field] = req.body[field];
    });

    await category.save(); // slug bhi apne aap update ho jayega

    res.json({ success: true, message: "Category updated", category });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Category hatana
 * @route   DELETE /api/categories/:id
 * @access  Admin only
 *
 * NOTE: agar is category me classes maujood hain to hum delete NAHI karte,
 * sirf hide (isActive: false) karte hain - warna un classes ka category
 * link toot jayega aur purani bookings ka record kharab hoga.
 */
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    if (category.activityCount > 0) {
      category.isActive = false;
      await category.save();

      return res.json({
        success: true,
        message: "Category has classes, so it was hidden instead of deleted",
        category,
      });
    }

    await category.deleteOne();

    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
