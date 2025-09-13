const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path"); // Import the 'path' module

dotenv.config();

const app = express();

// --- IMPORT YOUR API ROUTES ---
const userRoute = require("./routes/user");
const authRoute = require("./routes/auth");
const appointmentRoute = require("./routes/appointment");
const editTestRoute = require("./routes/EditTest");
const profilesRoute = require("./routes/profiles"); // <-- mount profiles API
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
// Your backend API routes should be defined BEFORE the React app is served.
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

// --- SERVE REACT APP (The Fix) ---
// This section serves the built React app from the 'frontend/build' folder.
const buildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(buildPath));

// This is the catch-all route. For any request that doesn't match an API route,
// it sends back the main index.html file from the React build.
// This allows React Router to handle the routing on the client-side.
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});
