const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
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

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.put('/update-user/:email', async(req, res) =>{
      const email = req.params.email;
      const updateInfo = req.body;
      const query = {email: email};
      const updateDoc = {
        $set: {
          name: updateInfo.name,
          phoneNumber: updateInfo.phoneNumber
        }
      }
      const result = await userCollection.updateOne(query, updateDoc, {upsert: true})
      res.send(result)
    })

    //post classes by teacher....
    app.post('/add-class', async(req, res)=>{
      const classInfo = req.body;
      const result = await classCollection.insertOne(classInfo)
      res.send(result);
    })

    //get all classes---
    app.get('/classes/:email', async(req, res) => {
      const email = req.params.email;
      // console.log(email)
      const result = await classCollection.find({email:email}).toArray()
      res.send(result)
    })
    //delete a class--
    app.delete('/delete-class/:id', async(req, res) => {
      const id = req.params.id;
      const result = await classCollection.deleteOne({_id: new ObjectId(id)})
      res.send(result)
    })

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
