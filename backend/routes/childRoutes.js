const express = require("express");
const router = express.Router();

const {
  getMyChildren,
  addChild,
  updateChild,
  deleteChild,
} = require("../controllers/childController");

const { protect, authorize } = require("../middleware/auth");

/**
 * Bachon ka data hassas hai - sab routes login shuda parent ke liye.
 * Har controller ke andar ownership check bhi hai.
 */
router.use(protect, authorize("parent", "admin"));

router.get("/", getMyChildren);
router.post("/", addChild);
router.put("/:id", updateChild);
router.delete("/:id", deleteChild);

module.exports = router;
