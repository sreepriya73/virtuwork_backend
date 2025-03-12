const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  emailid: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ["Client", "Freelancer"], // Enum with "client" and "freelancer"
    required: true 
  },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  address: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
 
  qualification: { type: String, required: true },
  bio: { type: String, required: true },
}, { timestamps: true });

const usermodel = mongoose.model('User', userSchema);

module.exports = { usermodel };