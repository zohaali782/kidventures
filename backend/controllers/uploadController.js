const {
  uploadPublic,
  uploadPrivate,
  getSignedUrl,
  deleteFile,
} = require("../config/cloudinary");
const InstructorProfile = require("../models/InstructorProfile");
const Activity = require("../models/Activity");
const User = require("../models/User");

/**
 * @desc    Profile photo upload (parent ya instructor)
 * @route   POST /api/uploads/avatar
 * @access  Logged in
 */
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please select an image" });
    }

    const result = await uploadPublic(req.file.buffer, "avatars");

    // Purani photo Cloudinary se hata do - warna kachra jama hota rahega
    const user = await User.findById(req.user._id);
    if (user.avatar?.publicId) {
      // Error chupana nahi — orphan files Cloudinary quota kharch karti hain
      deleteFile(user.avatar.publicId).catch((err) =>
        console.error(
          `! Old avatar delete failed (${user.avatar.publicId}): ${err.message}`,
        ),
      );
    }

    user.avatar = { url: result.secure_url, publicId: result.public_id };
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: "Photo uploaded", avatar: user.avatar });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Class ki image upload
 * @route   POST /api/uploads/activities/:id/image
 * @access  Instructor (apni class)
 */
const uploadActivityImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please select an image" });
    }

    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    // OWNERSHIP CHECK
    const isOwner = activity.instructor.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only upload images to your own classes",
      });
    }

    // Ek class me zyada se zyada 8 images
    if (activity.images.length >= 8) {
      return res.status(400).json({
        success: false,
        message: "Maximum 8 images per class. Please delete one first.",
      });
    }

    const result = await uploadPublic(req.file.buffer, "activities");

    activity.images.push({
      url: result.secure_url,
      publicId: result.public_id,
      // Pehli image khud ba khud cover ban jayegi
      isCover: activity.images.length === 0,
    });

    await activity.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Image uploaded",
        images: activity.images,
      });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Class ki image hatana
 * @route   DELETE /api/uploads/activities/:id/image/:imageId
 * @access  Instructor (apni class)
 */
const deleteActivityImage = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const isOwner = activity.instructor.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not your class" });
    }

    const image = activity.images.id(req.params.imageId);
    if (!image) {
      return res
        .status(404)
        .json({ success: false, message: "Image not found" });
    }

    const wasCover = image.isCover;

    /**
     * DOOSRI TEH KA BACHAO.
     *
     * Ab "images" EDITABLE_FIELDS me nahi hai, to koi apni marzi ka publicId
     * daal nahi sakta. Phir bhi yahan check laga rahe hain — agar kabhi
     * ghalti se woh raasta khul jaye to bhi kisi doosre ki file delete na ho.
     *
     * Hamare apne uploads hamesha "kidventures/activities/" folder me jate
     * hain (config/cloudinary.js dekhein).
     */
    if (image.publicId) {
      const isOurs = String(image.publicId).startsWith(
        "kidventures/activities/",
      );

      if (!isOurs) {
        console.error(
          `! Refusing to delete unexpected publicId "${image.publicId}" ` +
            `(activity ${activity._id}, user ${req.user._id})`,
        );
      } else {
        // Error chupana nahi — warna Cloudinary par orphan files jama
        // hote rehte hain aur quota kharch hoti rehti hai.
        deleteFile(image.publicId).catch((err) =>
          console.error(
            `! Cloudinary delete failed for ${image.publicId}: ${err.message}`,
          ),
        );
      }
    }

    image.deleteOne();

    // Cover hat gaya to pehli bachi image ko cover bana do
    if (wasCover && activity.images.length > 0) {
      activity.images[0].isCover = true;
    }

    await activity.save();

    res.json({
      success: true,
      message: "Image deleted",
      images: activity.images,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor gallery me image
 * @route   POST /api/uploads/gallery
 * @access  Instructor
 */
const uploadGalleryImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please select an image" });
    }

    const profile = await InstructorProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Please create your profile first" });
    }

    if (profile.gallery.length >= 12) {
      return res.status(400).json({
        success: false,
        message: "Maximum 12 gallery images",
      });
    }

    const result = await uploadPublic(req.file.buffer, "gallery");

    profile.gallery.push({
      url: result.secure_url,
      publicId: result.public_id,
      caption: req.body.caption?.slice(0, 120),
    });

    await profile.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Image added",
        gallery: profile.gallery,
      });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verification document upload (PRIVATE)
 * @route   POST /api/uploads/documents
 * @access  Instructor
 *
 * Body me "type" bhejna hai: emiratesId | tradeLicence | certificate
 *
 * SECURITY: ye files private hain. Response me sirf itna batate hain
 * ke upload ho gayi - koi URL wapas nahi jata, kyunke private file
 * ka koi seedha URL hota hi nahi.
 */
const uploadVerificationDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please select a file" });
    }

    const docType = String(req.body.type || "");
    const allowed = ["emiratesId", "tradeLicence", "certificate"];

    if (!allowed.includes(docType)) {
      return res.status(400).json({
        success: false,
        message: `Document type must be one of: ${allowed.join(", ")}`,
      });
    }

    let profile = await InstructorProfile.findOne({
      user: req.user._id,
    }).select("+documents");
    if (!profile) {
      profile = new InstructorProfile({ user: req.user._id });
    }

    // Approved instructor apne documents dobara upload na kare -
    // warna verification ke baad chupke se badal sakta hai.
    if (profile.verificationStatus === "approved") {
      return res.status(400).json({
        success: false,
        message:
          "Your profile is already verified. Contact support to update documents.",
      });
    }

    const result = await uploadPrivate(
      req.file.buffer,
      docType,
      req.file.mimetype,
    );

    const docData = {
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      originalName: req.file.originalname.slice(0, 120),
      uploadedAt: new Date(),
    };

    if (!profile.documents) profile.documents = {};

    if (docType === "certificate") {
      if (!profile.documents.certificates) profile.documents.certificates = [];

      if (profile.documents.certificates.length >= 5) {
        return res
          .status(400)
          .json({ success: false, message: "Maximum 5 certificates" });
      }

      profile.documents.certificates.push(docData);
    } else {
      // Purani file hata do
      const old = profile.documents[docType];
      if (old?.publicId) {
        deleteFile(old.publicId, old.resourceType, "private").catch((err) =>
          console.error(
            `! Old document delete failed (${old.publicId}): ${err.message}`,
          ),
        );
      }
      profile.documents[docType] = docData;
    }

    // Reject hua tha to status wapas incomplete - dobara submit karna hoga
    if (profile.verificationStatus === "rejected") {
      profile.verificationStatus = "incomplete";
    }

    await profile.save();

    res.status(201).json({
      success: true,
      message: "Document uploaded securely",
      uploaded: {
        type: docType,
        originalName: docData.originalName,
        uploadedAt: docData.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor apne documents ki LIST dekhe (URLs nahi)
 * @route   GET /api/uploads/documents
 * @access  Instructor
 *
 * Instructor ko sirf ye pata chalna chahiye ke kaun si file upload ho chuki hai.
 * Files khud sirf admin dekh sakta hai.
 */
const getMyDocumentList = async (req, res, next) => {
  try {
    const profile = await InstructorProfile.findOne({
      user: req.user._id,
    }).select("+documents");

    if (!profile) {
      return res.json({
        success: true,
        documents: { emiratesId: null, tradeLicence: null, certificates: [] },
      });
    }

    const d = profile.documents || {};

    const summarise = (doc) =>
      doc?.publicId
        ? {
            uploaded: true,
            originalName: doc.originalName,
            uploadedAt: doc.uploadedAt,
          }
        : null;

    res.json({
      success: true,
      verificationStatus: profile.verificationStatus,
      documents: {
        emiratesId: summarise(d.emiratesId),
        tradeLicence: summarise(d.tradeLicence),
        certificates: (d.certificates || []).map(summarise),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin ke liye documents ke waqti signed links
 * @route   GET /api/uploads/admin/documents/:profileId
 * @access  Admin only
 *
 * Har link sirf 10 minute chalega. Iske baad khud mar jayega.
 * Yani agar link ghalti se kahin share ho bhi jaye, to der tak kaam nahi karega.
 */
const getDocumentLinksForAdmin = async (req, res, next) => {
  try {
    const profile = await InstructorProfile.findById(req.params.profileId)
      .populate("user", "name email phone")
      .select("+documents");

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Instructor not found" });
    }

    const d = profile.documents || {};

    const signed = (doc) =>
      doc?.publicId
        ? {
            url: getSignedUrl(doc.publicId, doc.format, doc.resourceType, 10),
            originalName: doc.originalName,
            uploadedAt: doc.uploadedAt,
          }
        : null;

    res.json({
      success: true,
      instructor: {
        id: profile._id,
        name: profile.user?.name,
        email: profile.user?.email,
        verificationStatus: profile.verificationStatus,
      },
      note: "These links expire in 10 minutes",
      documents: {
        emiratesId: signed(d.emiratesId),
        tradeLicence: signed(d.tradeLicence),
        certificates: (d.certificates || []).map(signed),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadAvatar,
  uploadActivityImage,
  deleteActivityImage,
  uploadGalleryImage,
  uploadVerificationDocument,
  getMyDocumentList,
  getDocumentLinksForAdmin,
};
