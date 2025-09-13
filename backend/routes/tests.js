const router = require("express").Router();
const Test = require("../models/Test");
const { verifyTokenAndAdmin } = require("./verifyToken"); 

// GET ALL INDIVIDUAL TESTS (Public)
router.get("/", async (req, res) => {
    try {
        const tests = await Test.find().sort({ name: 1 });
        res.status(200).json(tests);
    } catch (err) {
        res.status(500).json(err);
    }
});

// CREATE INDIVIDUAL TEST (Admin Only)
router.post("/", verifyTokenAndAdmin, async (req, res) => {
    const newTest = new Test(req.body);
    try {
        const savedTest = await newTest.save();
        res.status(201).json(savedTest);
    } catch (err) {
        res.status(500).json(err);
    }
});

// --- NEW: UPDATE INDIVIDUAL TEST (Admin Only) ---
// This new route allows you to change the name and price of a test.
router.put("/:id", verifyTokenAndAdmin, async (req, res) => {
    try {
        const updatedTest = await Test.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true } // This option returns the updated document
        );
        res.status(200).json(updatedTest);
    } catch (err) {
        res.status(500).json(err);
    }
});


// DELETE INDIVIDUAL TEST (Admin Only)
router.delete("/:id", verifyTokenAndAdmin, async (req, res) => {
    try {
        await Test.findByIdAndDelete(req.params.id);
        res.status(200).json("Test has been deleted.");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
