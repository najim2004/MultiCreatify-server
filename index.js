// ----------------import--------------------
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

// ---------------mongodb--------------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d0cidbu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // All collections
    const database = client.db("MultiCreatify_DB");
    const usersCollection = await database.collection("Users");
    const worksheetCollection = await database.collection("WorkSheet");
    const paymentsCollection = await database.collection("Payments");

    // post a user info
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({
          message: "User already exists",
        });
      }
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    // post new work by post method
    app.post("/work-sheet", async (req, res) => {
      const newWork = req.body;
      const result = await worksheetCollection.insertOne(newWork);
      res.send(result);
    });

    // get specific user works data
    app.get("/work-sheet/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await worksheetCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // get single user payment information
    app.get("/salary-history/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentsCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("the server is running");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
