const mongoose = require("mongoose");

const redemptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Freelancer who redeemed
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" }, // Optional: linked task (if applicable)
  pointsRedeemed: { type: Number, required: true },
  cashValue: { type: Number, required: true },
  redeemedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Redemption", redemptionSchema);