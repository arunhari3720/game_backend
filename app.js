const express = require("express");
const app = express();
const cors = require("cors");

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://handcricket3720.netlify.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("Request Origin:", origin);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("api is running");
});

const userrouter = require("./src/routes/userroutes");
app.use("/api/user", userrouter);

const roomrouter = require("./src/routes/room");
app.use("/api/rooms", roomrouter);

console.log("app is touched");

app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    error: "Internal server error",
  });
});

module.exports = app;