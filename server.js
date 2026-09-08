require("dotenv").config();

const connectdb = require("./src/config/dbconfig");
const app = require("./app");

const startServer = async () => {
  try {
    await connectdb();
    console.log("DB connected");

    const PORT = process.env.PORT || 8500;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server not connected: ${error.message}`);
    process.exit(1);
  }
};

startServer();