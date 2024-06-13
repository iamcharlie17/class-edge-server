const express = require("express");
const cors = require("cors");
require("dotenv").config();
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
    const submissionCollection = client
      .db("ClassEdge")
      .collection("submissions");
    const assignmentCollection = client
      .db("ClassEdge")
      .collection("assignments");

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
      const query = { status: "approved" };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });
    //get class using id for class details users--
    app.get("/class/:id", async (req, res) => {
      const id = req.params.id;
      const result = await classCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //all users for admin only
    app.get("/all-users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    //for all users---
    app.put("/update-user/:email", async (req, res) => {
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
    app.put("/update-user-role/:id", async (req, res) => {
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
    });

    //get all classes by admin--
    app.get("/all-classes", async (req, res) => {
      const result = await classCollection
        .find()
        .sort({ status: -1 })
        .toArray();
      res.send(result);
    });

    //update class status by admin---
    app.put("/update-status/:id", async (req, res) => {
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
    });

    //post classes by teacher....
    app.post("/add-class", async (req, res) => {
      const classInfo = req.body;
      const result = await classCollection.insertOne(classInfo);
      res.send(result);
    });
    app.put("/update-class/:id", async (req, res) => {
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
    app.get("/classes/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email)
      const result = await classCollection.find({ email: email }).toArray();
      res.send(result);
    });
    //delete a class by teacher--
    app.delete("/delete-class/:id", async (req, res) => {
      const id = req.params.id;
      const result = await classCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    //post teacher info from request form data---
    app.post("/teachers", async (req, res) => {
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
    app.get("/teachers", async (req, res) => {
      const result = await teacherCollection
        .find()
        .sort({ status: -1 })
        .toArray();
      res.send(result);
    });

    //accept teacher information from request (admin)
    app.put("/accept-teacher/:email", async (req, res) => {
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
    });

    //reject teacher information from request (admin)
    app.put("/reject-teacher/:email", async (req, res) => {
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
    });

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
    app.post("/create-payment-intent", async (req, res) => {
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
    app.post("/payments", async (req, res) => {
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
    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      const payments = await paymentCollection.find({ email }).toArray();
      const classIds = payments.map((p) => p.classId);
      const objectIds = classIds.map((id) => new ObjectId(id));
      const query = { _id: { $in: objectIds } };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    //assignment post api--
    app.post("/create-assignment", async (req, res) => {
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
    app.get("/assignments/:id", async (req, res) => {
      const id = req.params.id;
      const result = await assignmentCollection.find({ classId: id }).toArray();
      res.send(result);
    });

    //increment assignment submission---
    app.put("/assignment-submission", async (req, res) => {
      const submissionInfo = req.body;
      await submissionCollection.insertOne(submissionInfo);

      const assignment = await assignmentCollection.findOne({
        _id: new ObjectId(submissionInfo.assignmentId),
      });
      // console.log(assignment)
      await assignmentCollection.updateOne(
        { _id: new ObjectId(submissionInfo.assignmentId)},
        { $inc: { submissions: 1 } }
      );
      const result = await classCollection.updateOne(
        { _id: new ObjectId(assignment.classId) },
        { $inc: { submissions: 1 } }
      );
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
