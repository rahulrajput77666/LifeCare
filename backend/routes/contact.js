// routes/contact.js
const Contact = require("../models/Contact");
const router = require("express").Router();

router.post("/", async (req, res) => {
    try {
        const newContact = new Contact({
            name: req.body.name,
            email: req.body.email,
            message: req.body.message,
        });
        const saved = await newContact.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error("Error saving contact:", err);
        res.status(500).json({ message: "Failed to save contact" });
    }
});

// ✅ NEW: Get all contacts for admin
router.get("/", async (req, res) => {
    try {
        const contacts = await Contact.find({}).sort({ createdAt: -1 });
        res.status(200).json(contacts);
    } catch (err) {
        console.error("Error fetching contacts:", err);
        res.status(500).json({ message: "Failed to fetch contacts" });
    }
});

module.exports = router;
