const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const SSLCommerzPayment = require("sslcommerz-lts");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5001;

// Middlewares
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3001",
      "https://dine-dash-client-side.web.app",
      "https://dine-dash-dashboard-side.web.app",
    ],
    credentials: true,
  })
);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const {
  sendInstruction,
} = require("./Utility/SendInstruction/SendInstruction");
const {
  PartnerRequestRejected,
} = require("./Utility/PartnerRequestRejected/PartnerRequestRejected");
const {
  SendInstructionToRider,
} = require("./Utility/SendIntructionToRider/SendInstructionToRider");
const {
  SendVerificationCode,
} = require("./Utility/SendVerificationCode/SendVerificationCode");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gef2z8f.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false;

async function run() {
  const addressCollection = client.db("DineDash-Ecom").collection("addresses");
  const providersCollection = client
    .db("DineDash-Ecom")
    .collection("providers");
  const restaurantsCollection = client
    .db("DineDash-Ecom")
    .collection("restaurants");
  const foodsCollection = client.db("DineDash-Ecom").collection("foods");
  const ordersCollection = client.db("DineDash-Ecom").collection("orders");
  const sslcommerzCollection = client
    .db("DineDash-Ecom")
    .collection("sslcommerz");
  const partnerRequestsCollection = client
    .db("DineDash-Ecom")
    .collection("partnerRequests");
  const riderRequestsCollection = client
    .db("DineDash-Ecom")
    .collection("riderRequests");
  const rolesCollection = client.db("DineDash-Ecom").collection("userRoles");
  const ridersCollection = client.db("DineDash-Ecom").collection("riders");
  const reviewsCollection = client.db("DineDash-Ecom").collection("reviews");
  const verifiedEmailsCollection = client
    .db("DineDash-Ecom")
    .collection("verifiedEmails");
  const offersCollection = client.db("DineDash-Ecom").collection("offers");
  const categoriesCollection = client
    .db("DineDash-Ecom")
    .collection("categories");

  const followersCollection = client
    .db("DineDash-Ecom")
    .collection("followers");

  offersCollection.createIndex({ expiresIn: 1 }, { expireAfterSeconds: 0 });

  try {
    // Add category
    app.post("/add-category", async (req, res) => {
      await categoriesCollection.insertOne(req.body);

      return res.send({ success: true });
    });

    // Get all category
    app.get("/all-category", async (req, res) => {
      let result = await categoriesCollection.find().toArray();

      res.send(result);
    });

    // Update category
    app.put("/update-category/:id", async (req, res) => {
      const { id } = req.params;
      const { name } = req.body;

      try {
        const result = await categoriesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { name } }
        );

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .send({ success: false, message: "Category not found" });
        }

        return res.send({
          success: true,
          message: "Category updated successfully",
        });
      } catch (error) {
        console.error("Error updating category:", error);
        return res
          .status(500)
          .send({ success: false, message: "Internal server error" });
      }
    });

    // Delete category
    app.delete("/delete-category/:id", async (req, res) => {
      const { id } = req.params; // Extract category ID from the request params

      try {
        const result = await categoriesCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .send({ success: false, message: "Category not found" });
        }

        return res.send({
          success: true,
          message: "Category deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting category:", error);
        return res
          .status(500)
          .send({ success: false, message: "Internal server error" });
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
