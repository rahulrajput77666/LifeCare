const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { User } = require("../models/User");

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "profiles");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const unique = `profile-${req.userId || 'anon'}-${Date.now()}${ext}`;
        cb(null, unique);
    }
});
const fileFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// simple verify middleware
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ message: "No token provided" });
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        req.userId = decoded._id;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

// Upload profile image (authenticated)
router.put("/upload", verifyToken, upload.single("profile"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        // update user profilePicture
        const filename = req.file.filename;
        const updated = await User.findByIdAndUpdate(req.userId, { profilePicture: filename }, { new: true }).select('-password');
        if (!updated) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ message: "Profile uploaded", user: updated });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ message: "Server error during upload" });
    }
});

// Remove profile image (authenticated)
router.delete("/remove", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.profilePicture) {
            const filePath = path.join(UPLOAD_DIR, user.profilePicture);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { console.warn("Could not delete file:", e); }
            }
        }
        user.profilePicture = "";
        await user.save();
        const returned = user.toObject(); delete returned.password;
        res.status(200).json({ message: "Profile removed", user: returned });
    } catch (err) {
        console.error("Remove profile error:", err);
        res.status(500).json({ message: "Server error during remove" });
    }
});

module.exports = router;
