require('dotenv').config();


const express = require('express');
const path = require('path');

const app = express();

app.post(
    "/api/paystack/webhook",
    express.raw({ type: "*/*", limit: "1mb" }),
 require("./api/paystack/webhook")
);

app.use(express.json({ limit: "1mb" }));

// API routes — each handler is a Vercel-style (req, res) function

app.post("/api/orders/create-cash", require("./api/orders/create-cash"));
app.post("/api/paystack/create-payment", require("./api/paystack/create-payment"));
app.post("/api/paystack/create-subaccount", require("./api/paystack/create-subaccount"));
app.post("/api/paystack/refund", require("./api/paystack/refund"));
app.post("/api/paystack/update-bank-details", require("./api/paystack/update-bank-details"));

// Static files — `extensions: ["html"]` gives you clean URLs (/login → login.html)
app.use(express.static(__dirname, { extensions: ["html"] }));


// SPA-style fallback for unknown paths (optional, keeps refresh from 404ing)
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "index.html"));
});



const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`CampusBites listening on ${port}`));


