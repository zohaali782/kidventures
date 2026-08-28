const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const {
  uploadAvatar,
  uploadActivityImage,
  deleteActivityImage,
  uploadGalleryImage,
  uploadIntroVideo,
  deleteIntroVideo,
  uploadVerificationDocument,
  getMyDocumentList,
  getDocumentLinksForAdmin,
} = require("../controllers/uploadController");

const { protect, authorize } = require("../middleware/auth");
const {
  uploadImage,
  uploadDocument,
  uploadVideo,
  handleUploadError,
  verifyImage,
  verifyDocument,
  verifyVideo,
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

/**
 * Video images se bohot bhari hoti hai — is route par alag, zyada sakht
 * limit (10/hour), upar wali 30/hour ke ilawa.
 */
const videoUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Video upload limit reached. Please try again later.",
  },
});

// Sab upload routes login shuda users ke liye hain
router.use(protect, uploadLimiter);

/* -------------------------------- Images -------------------------------- */
// "file" wo naam hai jo Postman/frontend form me dena hai
// verifyImage magic bytes check karta hai — mimetype/extension client
// bhejta hai, unke jhoot par bharosa nahi kiya ja sakta
router.post(
  "/avatar",
  uploadImage.single("file"),
  handleUploadError,
  verifyImage,
  uploadAvatar,
);

router.post(
  "/activities/:id/image",
  authorize("instructor", "admin"),
  uploadImage.single("file"),
  handleUploadError,
  verifyImage,
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
  verifyImage,
  uploadGalleryImage,
);

/* --------------------- Intro video (instructor profile) ------------------ */
router.post(
  "/intro-video",
  authorize("instructor"),
  videoUploadLimiter,
  uploadVideo.single("file"),
  handleUploadError,
  verifyVideo,
  uploadIntroVideo,
);

router.delete("/intro-video", authorize("instructor"), deleteIntroVideo);

/* ------------------------- Documents (PRIVATE) -------------------------- */
router.post(
  "/documents",
  authorize("instructor"),
  uploadDocument.single("file"),
  handleUploadError,
  verifyDocument,
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
