const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  emailid: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    enum: ["client", "freelancer"], // Enum with "client" and "freelancer"
    required: true 
  },
  dob: { type: Date },
  gender: { type: String },
  address: { type: String },
  district: { type: String },
  state: { type: String },
  qualification: { type: String },
  bio: { type: String },
}, 
// { timestamps: true } // Uncomment if you want createdAt/updatedAt fields
);

const usermodel = mongoose.model('User', userSchema);

module.exports = { usermodel };