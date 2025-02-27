const Mongoose = require('mongoose');

const adminSchema = new Mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  emailid: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const Admin = Mongoose.model('Admin', adminSchema);

module.exports = {Admin};
