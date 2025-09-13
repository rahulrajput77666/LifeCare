const router = require("express").Router();
const { Feedback } = require("../models/Feedback");

// --- POST /api/feedback ---
// Submit new feedback
router.post("/", async (req, res) => {
    try {
        const { name, email, feedback, rating } = req.body;
        const newFeedback = new Feedback({ name, email, feedback, rating });
        await newFeedback.save();
        res.status(201).json({ message: "Feedback submitted successfully!" });
    } catch (err) {
        console.error("Error submitting feedback:", err);
        res.status(500).json({ message: "Failed to submit feedback" });
    }
});

// --- GET /api/feedback ---
// Get stats and 4 most recent reviews
router.get("/", async (req, res) => {
    try {
        const [stats, latestReviews] = await Promise.all([
            Feedback.aggregate([
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        avgRating: { $avg: "$rating" }
                    }
                }
            ]),
            Feedback.find({}).sort({ createdAt: -1 }).limit(4)
        ]);

        res.status(200).json({
            stats: {
                count: stats.length ? stats[0].count : 0,
                avgRating: stats.length ? stats[0].avgRating : 0
            },
            reviews: latestReviews
        });
    } catch (err) {
        console.error("Error fetching feedback:", err);
        res.status(500).json({ message: "Failed to fetch feedback" });
    }
});

// --- GET /api/feedback/all ---
// Fetch all feedback sorted by newest
router.get("/all", async (req, res) => {
    try {
        const allFeedbacks = await Feedback.find({}).sort({ createdAt: -1 });
        res.status(200).json(allFeedbacks);
    } catch (err) {
        console.error("Error fetching all feedback:", err);
        res.status(500).json({ message: "Failed to fetch all feedback" });
    }
});

module.exports = router;
