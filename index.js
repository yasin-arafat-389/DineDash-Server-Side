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

    // Get Provider names and images
    app.get("/providers", async (req, res) => {
      const result = await providersCollection.find().toArray();
      res.send(result);
    });

    // Get Restaurents for homepage slider
    app.get("/restaurants", async (req, res) => {
      const result = await restaurantsCollection.find().toArray();
      res.send(result);
    });

    // Get All riders for admin overview
    app.get("/all-riders", async (req, res) => {
      const result = await ridersCollection.find().toArray();
      res.send(result);
    });

    // Get total orders placed for admin overview
    app.get("/all-orders", async (req, res) => {
      const result = await ordersCollection.find().toArray();
      res.send(result);
    });

    // Get total orders placed for partners/restaurants overview
    app.get("/all-orders/partner", async (req, res) => {
      let restaurant = req.query.name;

      const regularOrders = await ordersCollection
        .find({
          "cartFood.restaurant": restaurant,
        })
        .toArray();

      const customOrders = await ordersCollection
        .find({
          "burger.provider": restaurant,
        })
        .toArray();

      res.json({ regularOrders, customOrders });
    });

    // Get total orders delivered for partners/restaurants overview
    app.get("/orders-delivered/total", async (req, res) => {
      let restaurant = req.query.name;

      const totalRegularOrdersDelivered = await ordersCollection
        .find({
          "cartFood.restaurant": restaurant,
          "cartFood.status": "completed",
        })
        .toArray();

      const totalCustomOrdersDelivered = await ordersCollection
        .find({
          "burger.provider": restaurant,
          "burger.status": "completed",
        })
        .toArray();

      res.json({ totalRegularOrdersDelivered, totalCustomOrdersDelivered });
    });

    // Get total earned for partners/restaurants overview
    app.get("/total-earned", async (req, res) => {
      let restaurant = req.query.name;

      const totalRegularOrdersDelivered = await ordersCollection
        .find({
          "cartFood.restaurant": restaurant,
          "cartFood.status": "completed",
        })
        .toArray();

      const totalCustomOrdersDelivered = await ordersCollection
        .find({
          "burger.provider": restaurant,
          "burger.status": "completed",
        })
        .toArray();

      // Calculate total earned from regular orders
      const totalRegularEarned = totalRegularOrdersDelivered.reduce(
        (acc, order) => {
          // Sum the totalPrice of each burger in the burger array
          const regularTotal = order.cartFood.reduce((acc, regularItem) => {
            return acc + parseInt(regularItem.totalPrice);
          }, 0);
          // Add the sum to the accumulator
          return acc + regularTotal;
        },
        0
      );

      // Calculate total earned from custom orders
      const totalCustomEarned = totalCustomOrdersDelivered.reduce(
        (acc, order) => {
          // Sum the totalPrice of each burger in the burger array
          const burgerTotal = order.burger.reduce((burgerAcc, burgerItem) => {
            return burgerAcc + parseInt(burgerItem.totalPrice);
          }, 0);
          // Add the sum to the accumulator
          return acc + burgerTotal;
        },
        0
      );

      const grandTotal = totalRegularEarned + totalCustomEarned;

      res.json({ grandTotal });
    });

    // Get Delivery area of a rider
    app.get("/delivery-area", async (req, res) => {
      let name = req.query.name;
      let result = await ridersCollection.findOne({ name: name });
      res.send(result);
    });

    // Get all restaurants and their details fro admin overview
    app.get("/restaurants-and-details", async (req, res) => {
      const allRestaurants = await restaurantsCollection.find().toArray();

      const restaurantsWithData = [];

      for (const restaurant of allRestaurants) {
        const foods = await foodsCollection
          .find({ restaurant: restaurant.name })
          .toArray();

        const restaurantWithData = {
          restaurant: restaurant,
          foods: foods,
        };
        restaurantsWithData.push(restaurantWithData);
      }

      res.send(restaurantsWithData);
    });

    // Get all registered riders for admin overview
    app.get("/all-registered-riders", async (req, res) => {
      const result = await ridersCollection.find().toArray();
      res.send(result);
    });

    // Get single restaurant data
    app.get("/restaurantData", async (req, res) => {
      let name = req.query.name;
      let query = { pathname: name };
      const result = await restaurantsCollection.findOne(query);
      res.send(result);
    });

    // Get all food from foods collection
    app.get("/foods", async (req, res) => {
      const result = await foodsCollection.find().toArray();
      res.send(result);
    });

    // Get calculated food counts for pagination
    app.get("/foods/pagination", async (req, res) => {
      const query = req.query;
      const page = query.page;

      const pageNumber = parseInt(page);
      const perPage = 6;
      const skip = pageNumber * perPage;

      let foods = foodsCollection.find().skip(skip).limit(perPage);
      let result = await foods.toArray();
      let foodCounts = await foodsCollection.countDocuments();

      res.json({ result, foodCounts });
    });

    // Get single food details
    app.get("/food/details", async (req, res) => {
      try {
        let id = req.query.id;
        if (!id) {
          return res.status(400).send({ error: "Invalid ID provided" });
        }
        let foodId = new ObjectId(id);
        let result = await foodsCollection.findOne({ _id: foodId });
        if (!result) {
          return res.status(404).send({ error: "Food not found" });
        }
        res.send(result);
      } catch (error) {
        console.error("Error fetching food details:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    // Get foods for browse by category
    app.get("/foods/category", async (req, res) => {
      const category = req.query.category;
      let foods = foodsCollection.find({ category: category });
      let result = await foods.toArray();
      res.send(result);
    });

    // Get foods for search result
    app.get("/foods/search", async (req, res) => {
      const search = req.query.search;
      let query = {
        name: { $regex: search, $options: "i" },
      };
      let result = await foodsCollection.find(query).toArray();

      let noResultFound;
      if (result.length === 0) {
        noResultFound = "no result found";
      }

      res.json({ result, noResultFound });
    });

    // Get all restaurant specific food query by name
    app.get("/restaurant", async (req, res) => {
      const name = req.query.name;
      const foods = await foodsCollection.find({ restaurant: name }).toArray();
      res.status(200).json(foods);
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
