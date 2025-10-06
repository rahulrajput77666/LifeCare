const express = require('express');
const { Appointment } = require('../models/Appointment');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require("../middleware/verifyToken");

// Ensure uploads/reports directory exists to prevent multer errors
const UPLOADS_REPORTS_DIR = path.join(__dirname, '..', 'uploads', 'reports');
fs.mkdirSync(UPLOADS_REPORTS_DIR, { recursive: true });

// --- SETUP FOR FILE UPLOADS (MULTER) ---
// Configure storage for report files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_REPORTS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `report-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// Filter to allow only PDF files
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('File upload failed: Only PDF files are allowed.'), false);
    }
};

// Initialize multer with the storage and filter configuration
const upload = multer({ storage: storage, fileFilter: fileFilter });

// --- MIDDLEWARE ---

// Admin verification middleware
const verifyTokenAndAdmin = (req, res, next) => {
    verifyToken(req, res, async () => {
        try {
            const user = await User.findById(req.user._id);
            if (user && user.isAdmin) {
                next();
            } else {
                return res.status(403).json({ message: "Access denied. Requires admin privileges." });
            }
        } catch (dbError) {
            return res.status(500).json({ message: "Server error during user authorization." });
        }
    });
};

// --- USER ROUTES ---

// Get all appointments for the logged-in user
router.get('/my-appointments', verifyToken, async (req, res) => {
    try {
        const appointments = await Appointment.find({ user: req.user._id })
            .populate('tests', 'name')
            .populate('profiles', 'name')
            .sort({ date: -1 });
        res.status(200).json(appointments);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// Book an appointment - now requires login and links to user
router.post('/bookAppointment', verifyToken, async (req, res) => {
    try {
        console.log("Decoded JWT user:", req.user);
        if (!req.user._id) {
            console.warn("JWT payload missing _id:", req.user);
            return res.status(403).json({ message: "Invalid token: missing user id." });
        }
        const user = await User.findById(req.user._id);
        if (!user) {
            console.warn("Authenticated user not found for _id:", req.user._id);
            return res.status(404).json({ message: "Authenticated user not found." });
        }

        const newAppointment = new Appointment({
            ...req.body,
            user: user._id, // Link the appointment to the logged-in user
            email: user.email // Use the user's registered email
        });
        await newAppointment.save();
        // Return the created appointment so frontend can get its id for payment
        res.status(201).json({ message: "Appointment booked successfully!", appointment: newAppointment });
    } catch (error) {
        console.error("Book appointment error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// New: Allow appointment owner (authenticated user) to mark their appointment paid after successful payment
router.put('/markPaid/:id', verifyToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        // Ensure the requester owns the appointment
        if (appointment.user && appointment.user.toString() !== req.user._id) {
            return res.status(403).json({ message: "Forbidden: You do not own this appointment." });
        }

        // Update payment status and optionally store transaction info if provided
        const update = { isPaymentDone: true };
        if (req.body.transactionId) update.transactionId = req.body.transactionId;
        if (req.body.orderId) update.orderId = req.body.orderId;

        const updated = await Appointment.findByIdAndUpdate(req.params.id, update, { new: true });
        res.status(200).json({ message: "Payment status updated", appointment: updated });
    } catch (error) {
        console.error("markPaid error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// --- ADMIN ROUTES ---

// Defensive: Get all appointments (admin)
router.get('/getAllAppointments', async (req, res) => {
    try {
        // Extract token (Bearer or fallback)
        let token = null;
        const authHeader = (req.headers.authorization || req.headers.Authorization || '') + '';
        if (authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
        if (!token) token = req.headers['x-access-token'] || req.query?.token || null;

        if (!token) return res.status(401).json({ message: 'Access Denied: No Token Provided' });

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        } catch (verifyErr) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        // Confirm admin in DB (do not trust token claim alone)
        const dbUser = await User.findById(decoded._id).select('isAdmin');
        if (!dbUser) return res.status(404).json({ message: 'User not found' });
        if (!dbUser.isAdmin) return res.status(403).json({ message: 'Forbidden: Admins only' });

        // Fetch appointments without aggressive populate to avoid schema mismatch errors.
        // We'll try a light population of user field only if present.
        let appointments = await Appointment.find().lean();

        // Defensive: if appointments include user IDs, try to replace with basic user info.
        for (let i = 0; i < appointments.length; i++) {
            const a = appointments[i];
            try {
                if (a.user && typeof a.user !== 'object') {
                    const u = await User.findById(a.user).select('firstName lastName email').lean();
                    if (u) a.user = u;
                }
            } catch (innerErr) {
                // Ignore and keep original value; do not fail entire request.
            }
        }

        return res.status(200).json(appointments || []);
    } catch (err) {
        // Log full stack server-side for debugging, but return concise JSON to client.
        console.error('getAllAppointments error:', err && err.stack ? err.stack : err);
        const payload = { message: 'Internal Server Error' };
        if (process.env.NODE_ENV === 'development') {
            payload.error = err?.message;
            payload.stack = err?.stack;
        }
        return res.status(500).json(payload);
    }
});

// Update appointment status
router.put('/updateStatus/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updatedAppointment) return res.status(404).json({ message: "Appointment not found" });
        res.status(200).json({ message: "Status updated", appointment: updatedAppointment });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Update payment status
router.put('/updatePayment/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { isPaymentDone } = req.body;
        const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, { isPaymentDone }, { new: true });
        if (!updatedAppointment) return res.status(404).json({ message: "Appointment not found" });
        res.status(200).json({ message: "Payment status updated", appointment: updatedAppointment });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Update tested status
router.put('/updateTested/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { tested } = req.body;
        const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, { tested }, { new: true });
        if (!updatedAppointment) return res.status(404).json({ message: "Appointment not found" });
        res.status(200).json({ message: "Tested status updated", appointment: updatedAppointment });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Admin: Upload report for an appointment
router.post('/uploadReport/:id', verifyTokenAndAdmin, upload.single('report'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No report file was uploaded." });
        }
        // The unique filename generated by multer
        const reportFilename = req.file.filename;

        const updatedAppointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { report: reportFilename }, // Save only the filename to the database
            { new: true }
        );

        if (!updatedAppointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        res.status(200).json({ message: "Report uploaded successfully", appointment: updatedAppointment });
    } catch (error) {
        console.error("Report upload error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

module.exports = router;

