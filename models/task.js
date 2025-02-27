const Mongoose = require('mongoose');

const taskSchema = new Mongoose.Schema({
  description: { type: String, required: true },
  category: { type: String, required: true },
  deadline: { type: Date, required: true },
  budget: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },

});

module.exports = Mongoose.model('Task', taskSchema);
