const express = require("express");
const cors = require("cors");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://handcricket3720.netlify.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    //console.log("Request Origin:", origin);

    // Allow server-to-server / Postman requests without Origin
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked CORS Origin:", origin);
    return callback(new Error(`CORS blocked: ${origin}`));
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

// CORS MUST come before routes
app.use(cors(corsOptions));

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("api is running");
});

// Routes
const userrouter = require("./src/routes/userroutes");
app.use("/api/user", userrouter);

const roomrouter = require("./src/routes/room");
app.use("/api", roomrouter);

console.log("app is touched");

// Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  if (err.message && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      error: err.message,
    });
  }

  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

module.exports = app;