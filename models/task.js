const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  ClientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  description: { type: String, required: true },
  category: { type: String, required: true },
  deadline: { type: Date, required: true },
  budget: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ["pending", "accepted", "rejected", "confirmed"], 
    default: "pending", 
  }, 
  freelancerConfirmation: {
    type: String,
    enum: ["pending", "confirmed"],
    default: "pending",
  },
  freelancerId: { // Added to store the freelancer's userId
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  
  submission: { // Field for submitted work
    type: String, // e.g., Git link or file URL
    default: null,
  },
  
  createdAt: { type: Date, default: Date.now },

  paymentStatus: { type: String, default: "pending" },
  halfPaidAt: { type: Date,default: Date.now }, // New field for half payment timestamp
  fullyPaidAt: { type: Date,default: Date.now },
  rating: { type: Number, min: 1, max: 5 },
});



module.exports = mongoose.model("Task", taskSchema);