const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// dotenv configuration
dotenv.config();

const app = express();

// --- IMPORT YOUR API ROUTES ---
const userRoute = require("./routes/user");
const authRoute = require("./routes/auth");
const appointmentRoute = require("./routes/appointment");
const editTestRoute = require("./routes/EditTest");
const profilesRoute = require("./routes/profiles");
// (Import all your other API route files here)

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
    origin: "*", // Allow all origins
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization" // Explicitly allow Authorization header
}));
app.use(express.json());

// --- API ROUTES ---
// Your backend API routes should be defined BEFORE any frontend serving logic.
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/appointment", appointmentRoute);
app.use("/api/tests", editTestRoute);
app.use("/api/profiles", profilesRoute); // <-- add this line so GET /api/profiles works
// (Add all your other app.use for API routes here)

// --- GLOBAL ERROR HANDLER ---
// Add this before serving the React app so API errors are returned/logged consistently.
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err && err.stack ? err.stack : err);
  const payload = {
    message: err && err.message ? err.message : "Internal Server Error",
  };
  // include stack only in development for debugging
  if (process.env.NODE_ENV === "development" && err && err.stack) {
    payload.stack = err.stack;
  }
  res.status(err && err.status ? err.status : 500).json(payload);
});

// --- DO NOT SERVE REACT APP HERE ---
// Remove any code that serves frontend/build or index.html.
// Vercel/Netlify/Render will serve the frontend separately.

// --- START SERVER ---


// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});
