const express = require("express");
const app = express();
const cors = require("cors");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://handcricket3720.netlify.app/",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.get("/", (req, res) => {
  res.send("api is running");
});

const userrouter = require("./src/routes/userroutes");
app.use("/api/user", userrouter);

const roomrouter = require("./src/routes/room");
app.use("/api/rooms", roomrouter);

console.log("app is touched");

// Express 5 forwards rejected promises from async route handlers here
// automatically — this catches anything that throws/rejects in either
// router instead of crashing the process.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;