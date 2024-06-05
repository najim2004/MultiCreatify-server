// ----------------import--------------------
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// ----------------import--------------------

// ---------------------middleware--------------------
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};

// logger
const logger = async (req, res, next) => {
  console.log("called:", req.host, req.originalUrl);
  next();
};

// verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

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

    // verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const query = { email: email };
      const response = await usersCollection.findOne(query);
      if (response.role === "Admin") {
        next();
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    };
    // verify HR
    const verifyHR = async (req, res, next) => {
      const email = req.user.email;
      const query = { email: email };
      const response = await usersCollection.findOne(query);
      if (response.role === "HR") {
        next();
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    };
    // verify employee
    const verifyEmployee = async (req, res, next) => {
      const email = req.user.email;
      const query = { email: email };
      const response = await usersCollection.findOne(query);
      if (response.role === "Employee") {
        next();
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    };
    // verify employee & HR

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // remove cookies api
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });
    // post a user info
    app.post("/users", logger, async (req, res) => {
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
    // get all employee by get method (only HR)
    app.get("/users", logger, verifyToken, verifyHR, async (req, res) => {
      const role = req.query.role;
      const query = { role: role };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // get all employee & HR by get method (only admin)
    app.get(
      "/users/admin",
      logger,
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const query = {
          role: { $ne: "Admin" },
          verified: { $ne: false },
        };
        const result = await usersCollection.find(query).toArray();
        res.send(result);
      }
    );

    // update the user info by patch method (only admin)
    app.patch(
      "/users/:id",
      logger,
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const newData = req.body;
        const updateDoc = { $set: { ...newData } };
        const query = { _id: new ObjectId(id) };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );
    // get user by id by get method (only HR)
    app.get("/users/:id", logger, verifyToken, verifyHR, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // get user by email by get method (everyone)
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send({ role: result.role });
    });

    // post new work by post method (Employee only)
    app.post("/work-sheet", logger, verifyToken, async (req, res) => {
      const newWork = req.body;
      const result = await worksheetCollection.insertOne(newWork);
      res.send(result);
    });
    // get all worksheets (HR only)
    app.get("/work-sheet", logger, verifyToken, verifyHR, async (req, res) => {
      const result = await worksheetCollection.find().toArray();
      res.send(result);
    });

    // get specific user works data (Employee Only)
    app.get("/work-sheet/:email", logger, verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await worksheetCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // get single user payment information (Employee only)
    app.get("/salary-history/:email", logger, verifyToken, async (req, res) => {
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
