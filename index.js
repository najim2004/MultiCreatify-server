// ----------------import--------------------

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// ----------------import--------------------

// ---------------------middleware--------------------
app.use(
  cors()
  //     {
  //     origin: [
  //       "http://localhost:5173",
  //       "http://localhost:5174",
  //     ],
  //     credentials: true,
  //   }
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("the server is running");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
