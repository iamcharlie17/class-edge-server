const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 3200;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    optionSuccessStatus: 200,
  })
);
app.use(express.json());

const password = process.env.PASS;

const uri = `mongodb+srv://class_edge:${password}@cluster0.x7zkge4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
    const userCollection = client.db("ClassEdge").collection("users");
    const classCollection = client.db("ClassEdge").collection("classes");
    const teacherCollection = client.db("ClassEdge").collection("teachers");
    const paymentCollection = client.db("ClassEdge").collection("payments");
    const feedbackCollection = client.db("ClassEdge").collection("feedbacks");
    const submissionCollection = client
      .db("ClassEdge")
      .collection("submissions");
    const assignmentCollection = client
      .db("ClassEdge")
      .collection("assignments");

    //jwt related api----
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "365d",
      });
      // console.log('token from server: ', token)
      res.send({ token });
    });

    //middleware----verifyToken

    const verifyToken = (req, res, next) => {
      // console.log("inside verifyToken", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbiden access" });
      }
      const token = req?.headers?.authorization?.split(" ")[1];
      // console.log(token, "TOKEN");
      jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if (err) return res.status(401).send({ message: "forbiden access" });
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbiden access" });
      }
      next();
    };
    const verifyTeacher = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "teacher") {
        return res.status(403).send({ message: "forbiden access" });
      }
      next();
    };

    //all users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ message: "already exist user" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //all users
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    //get approved classes for all ---
    app.get("/approved-classes", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const query = { status: "approved" };
      const result = await classCollection
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/approved-classes-count", async (req, res) => {
      const count = await classCollection
        .find({ status: "approved" })
        .toArray();
      res.send(count);
    });

    //get class using id for class details users--
    app.get("/class/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await classCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //get popular classes (all)
    app.get("/popular-classes", async (req, res) => {
      const result = await classCollection
        .find()
        .sort({ enroll: -1 })
        .toArray();
      res.send(result);
    });

    //all users for admin only
    app.get("/all-users", verifyToken, verifyAdmin, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size) + 1;
      // console.log("pagination info: ", page, size);
      const result = await userCollection
        .find()
        .skip((page - 1) * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/all-users-count", verifyToken, verifyAdmin, async (req, res) => {
      const count = await userCollection.estimatedDocumentCount();
      res.send({ count });
    });

    //for all users---
    app.put("/update-user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const updateInfo = req.body;
      const query = { email: email };
      const updateDoc = {
        $set: {
          name: updateInfo.name,
          phoneNumber: updateInfo.phoneNumber,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc, {
        upsert: true,
      });
      res.send(result);
    });

    //update user role by admin--
    app.put(
      "/update-user-role/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const role = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: role.role,
          },
        };
        const result = await userCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );

    //get all classes by admin--
    app.get("/all-classes", verifyToken, verifyAdmin, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await classCollection
        .find()
        .skip((page - 1) * size)
        .limit(size)
        .sort({ status: -1 })
        .toArray();
      res.send(result);
    });

    app.get(
      "/all-classes-count",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const count = await classCollection.estimatedDocumentCount();
        res.send({ count });
      }
    );

    app.get("/all-classes-stats", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    //update class status by admin---
    app.put(
      "/update-status/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const status = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: status.status,
          },
        };
        const result = await classCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );

    //post classes by teacher....
    app.post("/add-class", verifyToken, async (req, res) => {
      const classInfo = req.body;
      const result = await classCollection.insertOne(classInfo);
      res.send(result);
    });
    app.put("/update-class/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title: updateInfo.title,
          image: updateInfo.image,
          price: updateInfo.price,
          category: updateInfo.category,
          description: updateInfo.description,
        },
      };
      const result = await classCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //get all classes for specific teacher---
    app.get("/classes/:email", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const email = req.params.email;
      // console.log(email)
      const result = await classCollection
        .find({ email: email })
        .skip((page - 1) * size)
        .limit(size + 1)
        .toArray();
      res.send(result);
    });

    app.get("classes/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await classCollection.find({ email: email }).toArray();
      res.send(result);
    });
    //delete a class by teacher--
    app.delete("/delete-class/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await classCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    //post teacher info from request form data---
    app.post("/teachers", verifyToken, async (req, res) => {
      const teacherInfo = req.body;

      const query = { email: teacherInfo?.email };
      const isExist = await teacherCollection.findOne(query);
      if (isExist) {
        const updateDoc = {
          $set: {
            status: teacherInfo.status,
            name: teacherInfo.name,
            title: teacherInfo.title,
            category: teacherInfo.category,
            image: teacherInfo.image,
            experience: teacherInfo.experience,
          },
        };
        await teacherCollection.updateOne(query, updateDoc);
        return res.send({ message: "teacher info updated" });
      }
      const result = await teacherCollection.insertOne(teacherInfo);
      res.send(result);
    });

    //get all teachers--
    app.get("/teachers", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size) + 1;
      const result = await teacherCollection
        .find()
        .skip((page - 1) * size)
        .limit(size)
        .sort({ status: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/teachers-count", verifyToken, async (req, res) => {
      const count = await teacherCollection.estimatedDocumentCount();
      res.send({ count });
    });

    //accept teacher information from request (admin)
    app.put(
      "/accept-teacher/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const status = req.body;
        const updateRole = {
          $set: {
            role: "teacher",
          },
        };
        await userCollection.updateOne(query, updateRole);

        const updateStatus = {
          $set: {
            status: status.status,
          },
        };
        const result = await teacherCollection.updateOne(query, updateStatus);
        res.send(result);
      }
    );

    //reject teacher information from request (admin)
    app.put(
      "/reject-teacher/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const status = req.body;

        const updateRole = {
          $set: {
            role: "user",
          },
        };
        await userCollection.updateOne(query, updateRole);

        const updateStatus = {
          $set: {
            status: status.status,
          },
        };
        const result = await teacherCollection.updateOne(query, updateStatus);
        res.send(result);
      }
    );

    //get accepted teachers (all)
    app.get("/accepted-teachers", async (req, res) => {
      const result = await teacherCollection
        .find({ status: "accepted" })
        .toArray();
      res.send(result);
    });

    //-------------------------------
    //   payment gateway
    //-------------------------------

    //payment intent----
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log(price, amount)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"], //important ----
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //post payment information (users)
    app.post("/payments", verifyToken, async (req, res) => {
      const paymentInfo = req.body;
      // console.log(paymentInfo);
      const query = { _id: new ObjectId(paymentInfo.classId) };
      const updateDoc = {
        $inc: {
          enroll: 1,
        },
      };
      await classCollection.updateOne(query, updateDoc);

      const result = await paymentCollection.insertOne(paymentInfo);
      res.send(result);
    });

    //get all payments using user email---(user)
    app.get("/payments/:email", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const email = req.params.email;
      const payments = await paymentCollection.find({ email }).toArray();
      const classIds = payments.map((p) => p.classId);
      const objectIds = classIds.map((id) => new ObjectId(id));
      const query = { _id: { $in: objectIds } };
      const result = await classCollection
        .find(query)
        .skip((page - 1) * size)
        .limit(size + 1)
        .toArray();
      res.send(result);
    });

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const payments = await paymentCollection.find({ email }).toArray();
      const classIds = payments.map((p) => p.classId);
      const objectIds = classIds.map((id) => new ObjectId(id));
      const query = { _id: { $in: objectIds } };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    //assignment post api--
    app.post("/create-assignment", verifyToken, async (req, res) => {
      const assignmentInfo = req.body;
      const updateDoc = {
        $inc: {
          assignments: 1,
        },
      };
      await classCollection.updateOne(
        { _id: new ObjectId(assignmentInfo.classId) },
        updateDoc
      );
      const result = await assignmentCollection.insertOne(assignmentInfo);
      res.send(result);
    });

    //get assignment api
    app.get("/assignments/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await assignmentCollection.find({ classId: id }).toArray();
      res.send(result);
    });

    //increment assignment submission---
    app.put("/assignment-submission", verifyToken, async (req, res) => {
      const submissionInfo = req.body;
      await submissionCollection.insertOne(submissionInfo);

      const assignment = await assignmentCollection.findOne({
        _id: new ObjectId(submissionInfo.assignmentId),
      });
      // console.log(assignment)
      await assignmentCollection.updateOne(
        { _id: new ObjectId(submissionInfo.assignmentId) },
        { $inc: { submissions: 1 } }
      );
      const result = await classCollection.updateOne(
        { _id: new ObjectId(assignment.classId) },
        { $inc: { submissions: 1 } }
      );
      res.send(result);
    });

    //post feedback (user )
    app.post("/feedback", verifyToken, async (req, res) => {
      const feedback = req.body;
      // console.log(feedback)
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });

    //get feedback--(all)
    app.get("/feedback", async (req, res) => {
      const result = await feedbackCollection.find().toArray();
      res.send(result);
    });

    app.get("/feedback/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await feedbackCollection.find({ classId: id }).toArray();
      res.send(result);
    });

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
  res.send("ClassEdge is running");
});
app.listen(port, () => {
  console.log("ClassEdge is running on port: ", port);
});
