const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

// --- IMPORT ROUTES ---
const userRoute = require("./routes/user");
const authRoute = require("./routes/auth");
const appointmentRoute = require("./routes/appointment");
const feedbackRoute = require("./routes/feedback");
const contactRoute = require("./routes/contact");
const testRoute = require("./routes/tests");
const profilesRoute = require("./routes/profiles");
const profileUploadRoute = require("./routes/profile");
const reportRoute = require("./routes/reports");
const razorpayRoute = require("./routes/razorpay");

// --- MONGODB CONNECTION ---
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- MIDDLEWARE ---
app.use(cors({
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));
app.use(express.json());

// --- API ROUTES ---
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/appointment", appointmentRoute);
app.use("/api/feedback", feedbackRoute);
app.use("/api/contact", contactRoute);
app.use("/api/tests", testRoute);
app.use("/api/profiles", profilesRoute);
app.use("/api/profile", profileUploadRoute);
app.use("/api/reports", reportRoute);
app.use("/api/checkout", razorpayRoute);

// Serve uploaded files (e.g., profile pictures, reports)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- DO NOT SERVE REACT APP HERE ---
// Remove any code that serves frontend/build or index.html.

// Optional: global error handler for API routes
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err && err.stack ? err.stack : err);
  const payload = { message: err && err.message ? err.message : "Internal Server Error" };
  if (process.env.NODE_ENV === "development" && err && err.stack) payload.stack = err.stack;
  res.status(err && err.status ? err.status : 500).json(payload);
});

// --- START SERVER ---
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});