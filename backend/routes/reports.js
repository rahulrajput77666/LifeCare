const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { Appointment } = require('../models/Appointment');
const { User } = require('../models/User'); // <-- added: use DB to confirm admin flag

// Middleware to verify the user's token from multiple places and enrich with DB info
const verifyTokenFromQuery = async (req, res, next) => {
    try {
        // Try multiple common locations for a token
        let token = null;
        if (req.query && req.query.token) token = req.query.token;
        if (!token && req.query && req.query.auth) token = req.query.auth;
        if (!token && (req.headers['x-access-token'])) token = req.headers['x-access-token'];
        if (!token && (req.headers.authorization || req.headers.Authorization)) {
            const authHeader = req.headers.authorization || req.headers.Authorization;
            if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return res.status(401).send('Access Denied: No Token Provided! Please include ?token=<JWT> or Authorization: Bearer <JWT>');
        }

        // Verify JWT (throws on invalid)
        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);

        // Try to load user from DB to get authoritative isAdmin flag
        try {
            const dbUser = await User.findById(decoded._id).select('isAdmin');
            if (dbUser) {
                // attach both decoded payload and authoritative isAdmin
                req.user = { ...decoded, isAdmin: Boolean(dbUser.isAdmin) };
            } else {
                // fallback to decoded if DB lookup didn't find user
                req.user = { ...decoded, isAdmin: Boolean(decoded.isAdmin) };
            }
        } catch (dbErr) {
            // If DB lookup fails, still proceed with decoded token but log the error
            console.error('User DB lookup failed in reports middleware:', dbErr);
            req.user = { ...decoded, isAdmin: Boolean(decoded.isAdmin) };
        }

        next();
    } catch (err) {
        console.error('Token verification error (reports):', err && err.message ? err.message : err);
        return res.status(400).send('Invalid Token');
    }
};

// --- SECURE REPORT DOWNLOAD ROUTE ---
// GET /api/reports/:filename
// This route securely serves a report file to the authorized user.
router.get('/:filename', verifyTokenFromQuery, async (req, res) => {
    try {
        const { filename } = req.params;
        const userId = String(req.user._id || req.user.id); // support different token shapes
        const isAdmin = Boolean(req.user.isAdmin);

        // Find the appointment that references this report filename
        const appointment = await Appointment.findOne({ report: filename });

        if (!appointment) {
            return res.status(404).json({ message: "Report not found" });
        }

        const ownerId = appointment.user ? String(appointment.user) : null;
        const isOwner = ownerId && ownerId === userId;

        // Allow download if requester is owner or an admin
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Forbidden: You do not have permission to access this report." });
        }

        // Construct file path
        const filePath = path.join(__dirname, '..', 'uploads', 'reports', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Report file not found on server.' });
        }

        // Set disposition so browsers download with original filename
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.sendFile(filePath);
    } catch (error) {
        console.error("Error serving report:", error && error.message ? error.message : error);
        return res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

