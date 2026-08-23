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

/**
 * MAGIC BYTES CHECK
 *
 * fileFilter sirf mimetype aur extension dekhta hai — aur dono client
 * bhejta hai. Koi "evil.html" ka naam "photo.jpg" rakh de aur header me
 * Content-Type: image/jpeg likh de, to dono checks pass ho jate hain.
 *
 * Asli pehchan file ke shuru ke chand bytes se hoti hai ("magic bytes"),
 * jinhe badla nahi ja sakta baghair file kharab kiye. Yeh middleware wohi
 * dekhta hai — Cloudinary par bhejne se PEHLE, taake quota bhi zaya na ho.
 */
const SIGNATURES = [
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

const startsWith = (buffer, bytes) =>
  bytes.every((b, i) => buffer[i] === b);

/** WEBP: "RIFF" ....  "WEBP" — size ke 4 bytes beech me hote hain */
const isWebp = (buffer) =>
  buffer.length >= 12 &&
  buffer.toString("ascii", 0, 4) === "RIFF" &&
  buffer.toString("ascii", 8, 12) === "WEBP";

const detectType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;
  if (isWebp(buffer)) return "image/webp";

  const match = SIGNATURES.find((s) => startsWith(buffer, s.bytes));
  return match ? match.type : null;
};

/**
 * @param {string[]} allowedTypes  woh types jo is route par chalti hain
 */
const verifyFileSignature = (allowedTypes) => (req, res, next) => {
  if (!req.file) return next();

  const actualType = detectType(req.file.buffer);

  if (!actualType || !allowedTypes.includes(actualType)) {
    console.warn(
      `[upload] signature mismatch — claimed "${req.file.mimetype}", ` +
        `detected "${actualType || "unknown"}" (user ${req.user?._id})`,
    );

    return res.status(400).json({
      success: false,
      message:
        "That file doesn't look like a real image or PDF. Please upload a genuine file.",
    });
  }

  // Aage ka code asli type hi istemal kare, client ka dawa nahi
  req.file.mimetype = actualType;

  next();
};

const verifyImage = verifyFileSignature(IMAGE_MIMES);
const verifyDocument = verifyFileSignature(DOC_MIMES);

module.exports = {
  uploadImage,
  uploadDocument,
  handleUploadError,
  verifyImage,
  verifyDocument,
};
