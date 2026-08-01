const multer = require("multer");
const path = require("path");

/**
 * Multer file ko RAM me rakhta hai (disk par nahi).
 * Wahan se hum foran Cloudinary bhej dete hain.
 *
 * Faida: server par koi file save nahi hoti - na jagah bharti hai,
 * na koi upload ki hui file server par chal sakti hai.
 */
const storage = multer.memoryStorage();

/**
 * SECURITY: file ki jaanch do tareeqon se.
 *
 * Sirf mimetype par bharosa nahi kar sakte - woh browser bhejta hai
 * aur aasani se badla ja sakta hai. Is liye extension bhi check karte hain.
 */
const makeFileFilter = (allowedMimes, allowedExts) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(
      new Error(`File type not allowed. Allowed: ${allowedExts.join(", ")}`),
    );
  }

  if (!allowedExts.includes(ext)) {
    return cb(
      new Error(
        `File extension not allowed. Allowed: ${allowedExts.join(", ")}`,
      ),
    );
  }

  cb(null, true);
};

/* ------------------------------- Images -------------------------------- */
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

const uploadImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
  fileFilter: makeFileFilter(IMAGE_MIMES, IMAGE_EXTS),
});

/* ------------------------------ Documents ------------------------------ */
// Documents me PDF bhi allowed hai (certificates aksar PDF hote hain)
const DOC_MIMES = ["image/jpeg", "image/png", "application/pdf"];
const DOC_EXTS = [".jpg", ".jpeg", ".png", ".pdf"];

const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MB
    files: 1,
  },
  fileFilter: makeFileFilter(DOC_MIMES, DOC_EXTS),
});

/**
 * Multer ke errors ko saaf message me badalta hai.
 * Iske baghair user ko "LIMIT_FILE_SIZE" jaisa technical lafz nazar aata hai.
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File is too large",
      });
    }
    if (
      err.code === "LIMIT_FILE_COUNT" ||
      err.code === "LIMIT_UNEXPECTED_FILE"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please upload one file at a time",
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  next();
};

module.exports = { uploadImage, uploadDocument, handleUploadError };
