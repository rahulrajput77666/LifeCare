const router = require("express").Router();
const Profile = require("../models/Profile");
const { verifyTokenAndAdmin } = require("./verifyToken");

// GET ALL PROFILES (Public)
router.get("/", async (req, res) => {
    try {
        const profiles = await Profile.find().populate("tests");
        res.status(200).json(profiles);
    } catch (err) {
        console.error("Error fetching profiles:", err);
        res.status(500).json({ message: "Failed to fetch profiles" });
    }
});

// CREATE PROFILE (Admin Only)
router.post("/", verifyTokenAndAdmin, async (req, res) => {
    try {
        const newProfile = new Profile(req.body);
        const savedProfile = await newProfile.save();
        res.status(201).json(savedProfile);
    } catch (err) {
        console.error("Error creating profile:", err);
        res.status(500).json({ message: "Failed to create profile" });
    }
});

// UPDATE PROFILE (Admin Only)
router.put("/:id", verifyTokenAndAdmin, async (req, res) => {
    try {
        const updatedProfile = await Profile.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        if (!updatedProfile) return res.status(404).json({ message: "Profile not found" });
        res.status(200).json(updatedProfile);
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ message: "Failed to update profile" });
    }
});

// DELETE PROFILE (Admin Only)
router.delete("/:id", verifyTokenAndAdmin, async (req, res) => {
    try {
        const deletedProfile = await Profile.findByIdAndDelete(req.params.id);
        if (!deletedProfile) return res.status(404).json({ message: "Profile not found" });
        res.status(200).json({ message: "Profile has been deleted." });
    } catch (err) {
        console.error("Error deleting profile:", err);
        res.status(500).json({ message: "Failed to delete profile" });
    }
});

module.exports = router;
