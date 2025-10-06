const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1] || req.headers['x-access-token'] || req.query?.token;
    if (!token) return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

module.exports = { verifyToken };
