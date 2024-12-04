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

  const blacklistsCollection = client
    .db("DineDash-Ecom")
    .collection("blacklist");

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

    // Insert order data to the orders collection and send email invoice (Cash On Delivery)
    app.post("/orders", async (req, res) => {
      let order = req.body;

      await ordersCollection.insertOne(order);

      res.send({ success: true });
    });

    // Insert order data to the orders collection and send email invoice (SSLCOMMERZ)
    app.post("/orders/sslcommerz", async (req, res) => {
      let order = req.body;

      await sslcommerzCollection.insertOne(order);

      let transactionId = new ObjectId().toString();
      const data = {
        total_amount: `${order.orderTotal}`,
        currency: "BDT",
        tran_id: transactionId,
        success_url: `http://localhost:5000/payment/success/${transactionId}/${order.randString}`,
        fail_url: `http://localhost:5000/payment/failed`,
        cancel_url: "https://dine-dash-client-side.web.app",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: `${order.name}`,
        cus_email: `${order.email}`,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
      });

      app.post("/payment/success/:tranID/:oid", async (req, res) => {
        let oid = req.params.oid;

        let orderToCommit = await sslcommerzCollection.findOne({
          randString: oid,
        });

        await ordersCollection.insertOne(orderToCommit);

        let redirectTo;
        if (orderToCommit.cartFood?.length > 0) {
          redirectTo = "myOrders";
        } else {
          redirectTo = "customMadeBurgers";
        }

        res.redirect(`http://localhost:5173/order-success/${redirectTo}`);
      });

      app.post("/payment/failed", async (req, res) => {
        res.redirect("http://localhost:5173/payment-cancelled");
      });
    });

    // Update user's delivery address to the database
    app.post("/update-address", async (req, res) => {
      let { address, email } = req.body;
      const result = await addressCollection.updateOne(
        { email: email },
        { $set: { address: address } },
        { upsert: true }
      );

      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        res.send({ success: true });
      } else {
        res.send({ success: false, message: "No changes made" });
      }
    });

    // Update user's delivery address to the database
    app.post("/update-phone", async (req, res) => {
      let { phone, email } = req.body;
      const result = await addressCollection.updateOne(
        { email: email },
        { $set: { phone: phone } },
        { upsert: true }
      );

      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        res.send({ success: true });
      } else {
        res.send({ success: false, message: "No changes made" });
      }
    });

    // Get user's address
    app.get("/my-address", async (req, res) => {
      const email = req.query.email;
      const address = await addressCollection.findOne({ email: email });
      res.send(address);
    });

    // Get all orders of a user
    app.get("/my-orders", async (req, res) => {
      const email = req.query.email;

      let result = await ordersCollection
        .find({ email: email })
        .project({
          _id: 1,
          cartFood: 1,
          burger: 1,
          date: 1,
          status: 1,
          order: 1,
        })
        .toArray();

      result.sort((a, b) => b.order - a.order);

      res.send(result);
    });

    // Store partner request to the database
    app.post("/partner-request", async (req, res) => {
      let data = req.body;
      await partnerRequestsCollection.insertOne(data);
      res.send({ success: true });
    });

    // Get partner request status
    app.get("/partner-request", async (req, res) => {
      let email = req.query.email;
      let result = await partnerRequestsCollection.findOne({ email: email });
      res.send(result);
    });

    // Get all partner request for admin
    app.get("/partner-requests", async (req, res) => {
      let result = await partnerRequestsCollection
        .find({ status: "pending" })
        .toArray();
      res.send(result);
    });

    // Get user role
    app.get("/get-role", async (req, res) => {
      let email = req.query.email;
      let result = await rolesCollection.findOne({ email: email });
      res.send(result);
    });

    // Accept partner request
    app.post("/accept/partner-request", async (req, res) => {
      let data = req.body;

      // await sendInstruction(data.email, data.name);

      await partnerRequestsCollection.updateOne(
        { email: data.email },
        { $set: { status: "accepted" } }
      );

      let insertToRoleCollection = {
        email: data.email,
        role: "restaurant-handler",
      };

      await rolesCollection.insertOne(insertToRoleCollection);

      res.send({ success: true });
    });

    // Reject partner request
    app.post("/reject/partner-request", async (req, res) => {
      let email = req.body.email;
      let name = req.body.name;

      // await PartnerRequestRejected(email, name);

      await partnerRequestsCollection.updateOne(
        { email: email },
        { $set: { status: "rejected" } }
      );

      res.send({ success: true });
    });

    // Register a restaurant
    app.post("/register-restaurant", async (req, res) => {
      let data = req.body;

      let insertToRestaurantsCollection = {
        name: data.restaurantName,
        thumbnail: data.thumbnail,
        pathname: data.restaurantName.toLowerCase().replace(/\s+/g, "-"),
      };

      await restaurantsCollection.insertOne(insertToRestaurantsCollection);

      await rolesCollection.insertOne({
        email: data.email,
        role: "restaurant-handler",
      });

      res.send({ success: true });
    });

    // Store rider requests to the database
    app.post("/rider-request", async (req, res) => {
      let data = req.body;
      await riderRequestsCollection.insertOne(data);
      res.send({ success: true });
    });

    // Get rider request status
    app.get("/rider-request", async (req, res) => {
      let email = req.query.email;
      let result = await riderRequestsCollection.findOne({ email: email });
      res.send(result);
    });

    // Get all rider request for admin
    app.get("/rider-requests", async (req, res) => {
      let result = await riderRequestsCollection
        .find({ status: "pending" })
        .toArray();
      res.send(result);
    });

    // Accept rider request
    app.post("/accept/rider-request", async (req, res) => {
      let data = req.body;

      await SendInstructionToRider(data.email, data.name);

      await riderRequestsCollection.updateOne(
        { email: data.email },
        { $set: { status: "accepted" } }
      );

      let insertToRoleCollection = {
        email: data.email,
        role: "rider",
      };

      await rolesCollection.insertOne(insertToRoleCollection);

      res.send({ success: true });
    });

    // Reject rider request
    app.post("/reject/rider-request", async (req, res) => {
      let email = req.body.email;
      let name = req.body.name;

      // await RiderRequestRejected(email, name);

      await riderRequestsCollection.updateOne(
        { email: email },
        { $set: { status: "rejected" } }
      );

      res.send({ success: true });
    });

    // Get rider request status
    app.get("/rider-request-status", async (req, res) => {
      let email = req.query.email;
      let result = await riderRequestsCollection.findOne({ email: email });
      res.send(result);
    });

    // Register Rider
    app.post("/register-rider", async (req, res) => {
      let data = req.body;

      let insertToRidersCollection = {
        name: data.name,
        phone: data.phone,
        region: data.region,
        totalDelivered: 0,
        totalEarned: 0,
      };

      await riderRequestsCollection.updateOne(
        { email: data.email },
        { $set: { resolved: true } }
      );

      await ridersCollection.insertOne(insertToRidersCollection);

      await rolesCollection.insertOne({ email: data.email, role: "rider" });

      res.send({ success: true });
    });

    // Get regular orders data for the restaurant handler
    app.get("/orders/partner", async (req, res) => {
      let restaurantName = req.query.name;

      const filteredOrders = await ordersCollection
        .find({
          "cartFood.restaurant": restaurantName,
        })
        .project({
          _id: 1,
          cartFood: {
            $filter: {
              input: "$cartFood",
              as: "item",
              cond: { $eq: ["$$item.restaurant", restaurantName] },
            },
          },
          name: 1,
          address: 1,
          phone: 1,
          region: 1,
          orderTotal: 1,
          paymentMethod: 1,
        })
        .toArray();

      res.send(filteredOrders);
    });

    // Accept regular order
    app.post("/accept/order/regular", async (req, res) => {
      let orderId = req.body.orderId;
      let { name } = req.query;

      let verifyIfBlacklisted = await blacklistsCollection.findOne({
        restaurant: name,
      });

      if (verifyIfBlacklisted) {
        return res.send({ success: false });
      }

      const acceptOrder = await ordersCollection.updateOne(
        {
          "cartFood.orderId": orderId,
        },
        {
          $set: {
            "cartFood.$.status": "cooking",
          },
        }
      );

      res.send({ success: true });
    });

    // Deliver order to rider
    app.post("/deliver/order/regular", async (req, res) => {
      let orderId = req.body.orderId;

      const deliverOrder = await ordersCollection.updateOne(
        {
          "cartFood.orderId": orderId,
        },
        {
          $set: {
            "cartFood.$.status": "completed",
          },
        }
      );

      res.send({ success: true });
    });

    // Reject regular order
    app.post("/reject/order/regular", async (req, res) => {
      let orderId = req.body.orderId;

      const rejectOrder = await ordersCollection.updateOne(
        {
          "cartFood.orderId": orderId,
        },
        {
          $set: {
            "cartFood.$.status": "cancelled",
          },
        }
      );

      res.send({ success: true });
    });

    // Get provider status (if a restaurant provides custom burger service or not)
    app.get("/provider/status", async (req, res) => {
      let name = req.query.name;
      let query = { provider: name };
      const result = await providersCollection.findOne(query);
      res.send(result);
    });

    // Insert custom burger provider details to the database
    app.post("/become-provider", async (req, res) => {
      let data = req.body;
      const result = await providersCollection.insertOne(data);
      res.send(result);
    });

    // Update burger ingredients price
    app.post("/update/ingredients/price", async (req, res) => {
      const updatedPrice = req.body.updatedPrice;
      const providerName = req.body.provider;
      const ingredientToUpdate = req.body.ingredientToUpdate;

      await providersCollection.findOneAndUpdate(
        { provider: providerName, "ing.name": ingredientToUpdate },
        { $set: { "ing.$.price": parseInt(updatedPrice) } }
      );

      res.send({ success: true });
    });

    // Get custom burger orders data for the restaurant handler
    app.get("/custom/orders/partner", async (req, res) => {
      let restaurantName = req.query.name;

      const filteredOrders = await ordersCollection
        .find({
          "burger.provider": restaurantName,
        })
        .project({
          _id: 1,
          burger: {
            $filter: {
              input: "$burger",
              as: "item",
              cond: { $eq: ["$$item.provider", restaurantName] },
            },
          },
          name: 1,
          address: 1,
          phone: 1,
          region: 1,
          orderTotal: 1,
          paymentMethod: 1,
        })
        .toArray();

      res.send(filteredOrders);
    });

    // Accept custom burger order
    app.post("/accept/order/custom", async (req, res) => {
      let orderId = req.body.orderId;

      const acceptOrder = await ordersCollection.updateOne(
        {
          "burger.orderId": orderId,
        },
        {
          $set: {
            "burger.$.status": "cooking",
          },
        }
      );

      res.send({ success: true });
    });

    // Reject custom burger order
    app.post("/reject/order/custom", async (req, res) => {
      let orderId = req.body.orderId;

      let rejectOrder = await ordersCollection.updateOne(
        {
          "burger.orderId": orderId,
        },
        {
          $set: {
            "burger.$.status": "cancelled",
          },
        }
      );

      res.send({ success: true });
    });

    // Deliver custom burger order to rider
    app.post("/deliver/order/custom", async (req, res) => {
      let orderId = req.body.orderId;

      const deliverOrder = await ordersCollection.updateOne(
        {
          "burger.orderId": orderId,
        },
        {
          $set: {
            "burger.$.status": "out for delivery",
          },
        }
      );

      res.send({ success: true });
    });

    // Insert new food to the database
    app.post("/add/new/food", async (req, res) => {
      let foodDetails = req.body;

      let { name } = req.query;

      let verifyIfBlacklisted = await blacklistsCollection.findOne({
        restaurant: name,
      });

      if (verifyIfBlacklisted) {
        return res.send({ success: false });
      }

      let convertedPrice = parseInt(foodDetails.price);

      foodDetails.price = convertedPrice;

      await foodsCollection.insertOne(foodDetails);

      res.send({ success: true });
    });

    // Get foods offered by individual restaurants
    app.get("/offered/foods", async (req, res) => {
      let restaurantName = req.query.restaurant;

      let foods = await foodsCollection
        .find({ restaurant: restaurantName })
        .toArray();

      res.send(foods);
    });

    // Update food details
    app.post("/update/food", async (req, res) => {
      let id = req.query.id;
      let updatedDetails = req.body;

      const objectId = new ObjectId(id);

      const result = await foodsCollection.updateOne(
        { _id: objectId },
        { $set: updatedDetails }
      );

      res.send({ success: true });
    });

    // Delete food
    app.post("/delete/food", async (req, res) => {
      let id = req.query.id;
      const objectId = new ObjectId(id);
      await foodsCollection.deleteOne({ _id: objectId });
      res.send({ success: true });
    });

    // Get incoming delivery data for rider
    app.get("/deliveries/incoming", async (req, res) => {
      const region = req.query.region;

      // Filter documents by region
      const result = await ordersCollection.find({ region: region }).toArray();

      // Create an array to store all objects from cartFood and burger arrays with status "cooking"
      let incomingDeliveries = [];

      // Loop through each document
      result.forEach((order) => {
        // Add objects from cartFood array with status "cooking" and isAcceptedByRider: false
        if (order.cartFood && order.cartFood.length > 0) {
          incomingDeliveries = incomingDeliveries.concat(
            order.cartFood
              .filter(
                (item) =>
                  item.status === "cooking" && item.isAcceptedByRider === false
              )
              .map((item) => ({
                ...item,
                paymentMethod: order.paymentMethod,
                phone: order.phone,
                address: order.address,
                orderType: "regular order",
              }))
          );
        }
        // Add objects from burger array with status "cooking" and isAcceptedByRider: false
        if (order.burger && order.burger.length > 0) {
          incomingDeliveries = incomingDeliveries.concat(
            order.burger
              .filter(
                (item) =>
                  item.status === "cooking" && item.isAcceptedByRider === false
              )
              .map((item) => ({
                ...item,
                paymentMethod: order.paymentMethod,
                restaurant: item.provider,
                phone: order.phone,
                address: order.address,
                orderType: "custom burger",
              }))
          );
        }
      });

      res.send(incomingDeliveries);
    });

    // Accept a delivery as a rider
    app.post("/accept/delivery", async (req, res) => {
      const orderId = req.query.orderId;
      const type = req.query.type;
      const riderName = req.query.riderName;

      let updateQuery = {};
      if (type === "regular order") {
        updateQuery = {
          $set: {
            "cartFood.$[item].isAcceptedByRider": `accepted by ${riderName}`,
          },
        };
      } else if (type === "custom burger") {
        updateQuery = {
          $set: {
            "burger.$[item].isAcceptedByRider": `accepted by ${riderName}`,
          },
        };
      }

      const filter = {
        $or: [{ "cartFood.orderId": orderId }, { "burger.orderId": orderId }],
      };
      const options = {
        arrayFilters: [{ "item.orderId": orderId }],
      };

      const result = await ordersCollection.updateOne(
        filter,
        updateQuery,
        options
      );

      res.send({ success: true });
    });

    // Get accepted deliveries for a rider
    app.get("/deliveries/accepted", async (req, res) => {
      const riderName = req.query.riderName;

      // Query the ordersCollection to find accepted deliveries for the rider
      const result = await ordersCollection
        .find({
          $or: [
            { "cartFood.isAcceptedByRider": `accepted by ${riderName}` },
            { "burger.isAcceptedByRider": `accepted by ${riderName}` },
          ],
        })
        .toArray();

      // Extract and combine the accepted deliveries from both cartFood and burger arrays
      const acceptedDeliveries = result.reduce((acc, order) => {
        if (order.cartFood) {
          acc.push(
            ...order.cartFood
              .filter(
                (item) => item.isAcceptedByRider === `accepted by ${riderName}`
              )
              .map((item) => ({
                ...item,
                restaurant: item.restaurant,
                address: order.address,
                phone: order.phone,
                orderType: "regular order",
                paymentMethod: order.paymentMethod,
              }))
          );
        }
        if (order.burger) {
          acc.push(
            ...order.burger
              .filter(
                (item) => item.isAcceptedByRider === `accepted by ${riderName}`
              )
              .map((item) => ({
                ...item,
                restaurant: item.provider,
                address: order.address,
                phone: order.phone,
                orderType: "custom burger",
                paymentMethod: order.paymentMethod,
              }))
          );
        }
        return acc;
      }, []);

      res.send(acceptedDeliveries);
    });

    // Deliver order to the customer
    app.post("/deliver/food", async (req, res) => {
      const orderId = req.query.orderId;
      const type = req.query.type;
      const riderName = req.query.riderName;

      let updateQuery = {};
      if (type === "regular order") {
        updateQuery = {
          $set: {
            "cartFood.$[item].isAcceptedByRider": `delivered by ${riderName}`,
            "cartFood.$[item].status": `completed`,
          },
        };
      } else if (type === "custom burger") {
        updateQuery = {
          $set: {
            "burger.$[item].isAcceptedByRider": `delivered by ${riderName}`,
            "burger.$[item].status": `completed`,
          },
        };
      }

      const filter = {
        $or: [{ "cartFood.orderId": orderId }, { "burger.orderId": orderId }],
      };
      const options = {
        arrayFilters: [{ "item.orderId": orderId }],
      };

      const result = await ordersCollection.updateOne(
        filter,
        updateQuery,
        options
      );

      await ridersCollection.findOneAndUpdate(
        { name: riderName },
        { $inc: { totalDelivered: 1, totalEarned: 50 } },
        { returnOriginal: false }
      );

      res.send({ success: true });
    });

    // Insert user review to the database
    app.post("/submit/review", async (req, res) => {
      let data = req.body;

      await ordersCollection.updateOne(
        {
          "cartFood.orderId": data.orderId,
        },
        {
          $set: {
            "cartFood.$.reviewed": true,
          },
        }
      );

      await reviewsCollection.insertOne({
        identifier: data.identifier,
        review: data.review,
        rating: data.rating,
        userName: data.user,
        profileImage: data.profileImage,
        restaurant: data.restaurant,
        date: data.date,
      });

      res.send({ success: true });
    });

    // Get vendor specific reviews
    app.get("/reviews/for-vendor", async (req, res) => {
      let { restaurant } = req.query;
      console.log(restaurant);

      let result = await reviewsCollection.find({ restaurant }).toArray();

      res.send(result);
    });

    // Get all reviews for a specific food
    app.get("/reviews/foods", async (req, res) => {
      let id = req.query.id;
      let results = await reviewsCollection.find({ identifier: id }).toArray();
      res.send(results);
    });

    // Send verification code to user gmail
    app.post("/send/verificationCode", async (req, res) => {
      let email = req.body.email;
      let name = req.body.name;

      function verificationCode() {
        const characters =
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let result = "";
        for (let i = 0; i < 10; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          result += characters.charAt(randomIndex);
        }
        return result;
      }

      const code = verificationCode();

      await SendVerificationCode(email, name, code);

      await verifiedEmailsCollection.insertOne({
        email: email,
        verificationCode: code,
        isVerified: false,
      });

      res.send({ success: true });
    });

    // Verify user gmail and change status
    app.post("/verify/gmail", async (req, res) => {
      let verificationCode = req.body.verificationCode;

      let emailToVerify = await verifiedEmailsCollection.findOne({
        verificationCode: verificationCode,
      });

      if (!emailToVerify) {
        return res.send({ error: "email not found" });
      } else if (emailToVerify.isVerified === true) {
        return res.send({ error: "email already verified" });
      }

      await verifiedEmailsCollection.findOneAndUpdate(
        { verificationCode: verificationCode },
        { $set: { isVerified: true } }
      );

      res.send({ success: true });
    });

    // Check if user gmail is verified
    app.post("/check/verificationStatus", async (req, res) => {
      let email = req.body.email;

      let emailToCheck = await verifiedEmailsCollection.findOne({
        email: email,
      });

      if (!emailToCheck) {
        return res.send({ status: "unregistered user" });
      } else if (emailToCheck.isVerified === false) {
        return res.send({ status: "not verified yet" });
      } else {
        return res.send({ status: "verified" });
      }
    });

    // Create new coupon
    app.post("/create-offer", async (req, res) => {
      const foodId = await offersCollection.findOne({
        "selectedFood._id": req.body.selectedFood._id,
      });

      if (!foodId) {
        req.body.expiresIn = new Date(req.body.expiresIn);
        await offersCollection.insertOne(req.body);
      }

      if (foodId?.selectedFood?._id === req.body.selectedFood._id) {
        return res.json({
          success: false,
          message: "There is already an active coupon for this food!!",
        });
      }

      return res.send({ success: true });
    });

    // Get coupons for individual vendors
    app.get("/get-coupons", async (req, res) => {
      if (req.query.allCoupons) {
        const result = await offersCollection.find().toArray();
        return res.send(result);
      }

      if (req.query.restaurant) {
        const result = await offersCollection
          .find({
            restaurant: req.query.restaurant,
          })
          .toArray();

        return res.send(result);
      }

      if (req.query.foodId) {
        const result = await offersCollection.findOne({
          "selectedFood._id": req.query.foodId,
        });

        console.log(result);

        return res.send(result);
      }

      return res.send({ success: false });
    });

    // Delete an offer
    app.delete("/delete-coupon", async (req, res) => {
      await offersCollection.deleteOne({
        _id: new ObjectId(req.query.id),
      });

      return res.send({ success: true });
    });

    // Apply coupon
    app.post("/apply-coupon", async (req, res) => {
      let email = req.query.email;
      let couponId = req.query.couponId;

      let coupon = await offersCollection.findOne({
        _id: new ObjectId(couponId),
      });

      let alreadyApplied = coupon.couponUsedBy.some(
        (user) => user.email === email
      );

      if (alreadyApplied) {
        return res.send({
          success: false,
          message: "Coupon already used by this user",
        });
      }

      await offersCollection.updateOne(
        { _id: new ObjectId(couponId) },
        { $push: { couponUsedBy: { email } } }
      );

      return res.send({ success: true });
    });

    // Foolow/unfollow shop
    app.post("/follow/shop", async (req, res) => {
      try {
        const { email } = req.body;

        // Check if the email already exists in the collection
        const checkIfExists = await followersCollection.findOne({ email });

        if (checkIfExists) {
          // If it exists, delete the record and send an unfollow response
          await followersCollection.deleteOne({ email });
          return res.status(200).send({ message: "Successfully Unfollowed!!" });
        }

        // If it doesn't exist, insert a new record and send a follow response
        await followersCollection.insertOne(req.body);
        return res.status(200).send({ message: "Successfully Followed!!" });
      } catch (error) {
        console.error("Error in follow/unfollow API:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // get follow data
    app.get("/follow/shop", async (req, res) => {
      let result = await followersCollection
        .find({ restaurant: req.query.restaurant })
        .toArray();

      res.send(result);
    });

    // Blacklist/remove blacklist vendor
    app.post("/blacklist/vendor", async (req, res) => {
      try {
        const { restaurant } = req.body;

        // Check if the vendor already exists in the collection
        const checkIfExists = await blacklistsCollection.findOne({
          restaurant,
        });

        if (checkIfExists) {
          // If it exists, delete the record and send an unfollow response
          await blacklistsCollection.deleteOne({ restaurant });
          return res
            .status(200)
            .send({ message: "Successfully removed from blacklist!!" });
        }

        // If it doesn't exist, insert a new record
        await blacklistsCollection.insertOne(req.body);
        return res.status(200).send({
          message:
            "Successfully blacklisted. This vendor will no longer be able to add new food or accept orders from orders option.",
        });
      } catch (error) {
        console.error("Error in API:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // get blacklist data
    app.get("/blacklist/list", async (req, res) => {
      let result = await blacklistsCollection.find().toArray();

      res.send(result);
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
