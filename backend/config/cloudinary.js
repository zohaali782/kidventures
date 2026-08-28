const cloudinary = require("cloudinary").v2;

/**
 * Cloudinary = images/documents rakhne ki online jagah.
 * Files hamare server par save nahi hotin - seedha Cloudinary jati hain.
 *
 * Keys .env se aati hain, code me kabhi nahi likhni.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // hamesha https
});

/**
 * PUBLIC upload - class images, profile photos, gallery.
 * Ye cheezein website par sab ko nazar aani hain, is liye normal upload.
 */
const uploadPublic = (fileBuffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `kidventures/${folder}`,
        resource_type: "image",
        type: "upload", // publicly accessible
        // Bara image khud chhota ho jaye - page fast load hoga
        transformation: [
          { width: 1600, height: 1600, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );

    stream.end(fileBuffer);
  });

/**
 * PRIVATE upload - Emirates ID, trade licence, certificates.
 *
 * SECURITY: type "private" ka matlab hai ye file ka koi seedha URL
 * kaam nahi karega. Chahe kisi ko public_id pata bhi chal jaye,
 * woh file nahi khol sakta.
 *
 * Sirf hamara server (jiske paas API secret hai) waqti signed link
 * bana sakta hai - aur woh link sirf admin ko milta hai.
 */
const uploadPrivate = (fileBuffer, folder, mimetype) =>
  new Promise((resolve, reject) => {
    // PDF ko Cloudinary "image" hi samajhta hai, baqi files "raw"
    const isImageLike =
      mimetype.startsWith("image/") || mimetype === "application/pdf";

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `kidventures/private/${folder}`,
        resource_type: isImageLike ? "image" : "raw",
        type: "private", // <- sab se ahem line
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );

    stream.end(fileBuffer);
  });

/**
 * VIDEO upload - instructor ki intro video (profile ke liye).
 *
 * Video seedha Cloudinary CDN par jati hai, hamare Node server par kabhi
 * nahi rukti - is liye website slow nahi hoti chahe video kitni bhi baar
 * dekhi jaye. Yahan koi bhari "eager" transformation nahi lagayi - upload
 * turant khatam ho jata hai. Compression/format optimisation delivery ke
 * waqt URL parameters se hoti hai (dekho frontend ka video URL banane wala
 * helper), Cloudinary use pehli dafa transform karke CDN par cache kar
 * leta hai.
 */
const uploadVideo = (fileBuffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `kidventures/${folder}`,
        resource_type: "video",
        type: "upload", // publicly accessible
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );

    stream.end(fileBuffer);
  });

/**
 * Private file ke liye waqti link banata hai.
 * expiresInMinutes ke baad link khud mar jata hai.
 */
const getSignedUrl = (
  publicId,
  format,
  resourceType,
  expiresInMinutes = 10,
) => {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;

  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType || "image",
    type: "private",
    expires_at: expiresAt,
  });
};

/**
 * File hatana (jab instructor apni gallery se image delete kare).
 */
const deleteFile = (publicId, resourceType = "image", type = "upload") =>
  cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type });

module.exports = {
  cloudinary,
  uploadPublic,
  uploadVideo,
  uploadPrivate,
  getSignedUrl,
  deleteFile,
};
