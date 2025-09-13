const jwt = require("jsonwebtoken");
const { User } = require("../models/User"); // Ensure path to your User model is correct

/**
 * This middleware is the single source of truth for verifying an admin token.
 * It checks the 'Authorization' header for a valid JWT.
 * If the token is valid AND the user is an admin, it allows the request to proceed.
 * Otherwise, it blocks the request with an error.
 */
const verifyTokenAndAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

        // Verify the token using the secret key from your .env file
        jwt.verify(token, process.env.JWTPRIVATEKEY, async (err, decoded) => {
            if (err) {
                // This will catch invalid or expired tokens
                return res.status(403).json({ message: "Token is not valid!" });
            }
            
            try {
                // Find the user in the database based on the ID stored in the token
                const user = await User.findById(decoded._id);

                // Check if the user exists and has the isAdmin flag set to true
                if (user && user.isAdmin) {
                    req.user = user; // Optionally attach user info to the request
                    next(); // Success! Proceed to the route's main logic.
                } else {
                    // If the user is not an admin or was not found
                    return res.status(403).json({ message: "You are not authorized to perform this action!" });
                }
            } catch (dbError) {
                 return res.status(500).json({ message: "Server error during user authorization." });
            }
        });
    } else {
        // If no 'Authorization' header with a Bearer token is found
        return res.status(401).json({ message: "You are not authenticated!" });
    }
};

module.exports = { verifyTokenAndAdmin };
