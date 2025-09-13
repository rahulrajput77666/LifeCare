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
// --- FIX: Import the Razorpay routes ---
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
// --- FIX: Register the Razorpay routes under the /api/checkout path ---
app.use("/api/checkout", razorpayRoute);


// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Optional: global error handler for API routes
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err && err.stack ? err.stack : err);
  const payload = { message: err && err.message ? err.message : "Internal Server Error" };
  if (process.env.NODE_ENV === "development" && err && err.stack) payload.stack = err.stack;
  res.status(err && err.status ? err.status : 500).json(payload);
});

// --- SERVE REACT APP ---
const buildPath = path.join(__dirname, "../frontend/build");
app.use(express.static(buildPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// --- START SERVER ---
const PORT = Number(process.env.PORT) || 5000;

function startServer(port, maxRetries = 5) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`🚀 Backend server running on port ${port}`);
      resolve(server);
    });
    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && maxRetries > 0) {
        console.warn(`Port ${port} in use. Trying ${port + 1} (retries left: ${maxRetries - 1})...`);
        setTimeout(() => startServer(port + 1, maxRetries - 1).then(resolve).catch(reject), 300);
      } else {
        console.error(`Failed to start server on port ${port}:`, err && err.message ? err.message : err);
        reject(err);
      }
    });
  });
}

startServer(PORT).catch((err) => {
  console.error("Server startup failed. Inspect the error above.");
  process.exit(1);
});
