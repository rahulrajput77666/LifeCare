const router = require("express").Router();
const { User } = require("../models/User");
const Token = require("../models/token");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const bcrypt = require("bcryptjs"); // ✅ FIX: Changed back to bcryptjs
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");

// --- USER REGISTRATION ---
router.post("/Register", async (req, res) => {
    try {
        const { error } = validateRegistration(req.body);
        if (error)
            return res.status(400).send({ message: error.details[0].message });

        let user = await User.findOne({ email: req.body.email });
        if (user)
            return res.status(409).send({ message: "User with given email already exists!" });

        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        const hashPassword = await bcrypt.hash(req.body.password, salt);

        // Auto-verify the user at registration
        user = await new User({ ...req.body, password: hashPassword, verified: true }).save();
        res.status(201).send({ message: "Account created and verified." });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

// --- USER LOGIN ---
router.post("/Login", async (req, res) => {
    try {
        const { error } = validateLogin(req.body);
        if (error)
            return res.status(400).send({ message: error.details[0].message });

        const user = await User.findOne({ email: req.body.email });
        if (!user)
            return res.status(401).send({ message: "Invalid Email or Password" });

        const validPassword = await bcrypt.compare(
            req.body.password,
            user.password
        );
        if (!validPassword)
            return res.status(401).send({ message: "Invalid Email or Password" });

        if (!user.verified) {
            let token = await Token.findOne({ userId: user._id });
            if (!token) {
                token = await new Token({
                    userId: user._id,
                    token: crypto.randomBytes(32).toString("hex"),
                }).save();
                const url = `${process.env.BASE_URL}users/${user.id}/verify/${token.token}`;
                await sendEmail(user.email, "Verify Email", url);
            }
            return res.status(400).send({ message: "An Email was sent to your account. Please verify." });
        }

        const token = user.generateAuthToken();
        res.status(200).send({
            data: token,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isAdmin: user.isAdmin,
                profilePicture: user.profilePicture || ""
            },
            message: "Logged in successfully",
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});


// --- VALIDATION HELPERS ---
const validateRegistration = (data) => {
    const schema = Joi.object({
        firstName: Joi.string().required().label("First Name"),
        lastName: Joi.string().required().label("Last Name"),
        email: Joi.string().email().required().label("Email"),
        password: passwordComplexity().required().label("Password"),
    });
    return schema.validate(data);
};

const validateLogin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required().label("Email"),
        password: Joi.string().required().label("Password"),
    });
    return schema.validate(data);
};

module.exports = router;













