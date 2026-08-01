const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const {
  uploadAvatar,
  uploadActivityImage,
  deleteActivityImage,
  uploadGalleryImage,
  uploadVerificationDocument,
  getMyDocumentList,
  getDocumentLinksForAdmin,
} = require("../controllers/uploadController");

const { protect, authorize } = require("../middleware/auth");
const {
  uploadImage,
  uploadDocument,
  handleUploadError,
} = require("../middleware/upload");

/**
 * SECURITY: uploads mehngi hain (bandwidth + Cloudinary quota).
 * Ek user ghanta bhar me 30 se zyada files upload nahi kar sakta.
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Upload limit reached. Please try again later.",
  },
});

// Sab upload routes login shuda users ke liye hain
router.use(protect, uploadLimiter);

/* -------------------------------- Images -------------------------------- */
// "file" wo naam hai jo Postman/frontend form me dena hai
router.post(
  "/avatar",
  uploadImage.single("file"),
  handleUploadError,
  uploadAvatar,
);

router.post(
  "/activities/:id/image",
  authorize("instructor", "admin"),
  uploadImage.single("file"),
  handleUploadError,
  uploadActivityImage,
);

router.delete(
  "/activities/:id/image/:imageId",
  authorize("instructor", "admin"),
  deleteActivityImage,
);

router.post(
  "/gallery",
  authorize("instructor"),
  uploadImage.single("file"),
  handleUploadError,
  uploadGalleryImage,
);

/* ------------------------- Documents (PRIVATE) -------------------------- */
router.post(
  "/documents",
  authorize("instructor"),
  uploadDocument.single("file"),
  handleUploadError,
  uploadVerificationDocument,
);

router.get("/documents", authorize("instructor"), getMyDocumentList);

/* ---------------------------- Admin ke liye ----------------------------- */
// Ye website ki wahid jagah hai jahan se documents khule ja sakte hain
router.get(
  "/admin/documents/:profileId",
  authorize("admin"),
  getDocumentLinksForAdmin,
);

module.exports = router;
