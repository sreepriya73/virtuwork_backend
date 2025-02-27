const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  emailid: { type: String, required: true},
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, required: true  },
  dob: { type: Date },
  gender: { type: String },
  address: { type: String },
  district: { type: String },
  state: { type: String },
  
  qualification: { type: String },
  bio: { type: String }

}, 
// { timestamps: true }
);

const usermodel = mongoose.model('User', userSchema);

module.exports = { usermodel };

