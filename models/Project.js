const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User model for clients
    required: true,
  },
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User model for freelancers
    required: true,
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task', // Reference to the Task model
    required: true, // Assuming each project must be linked to a task
  },
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  budget: {
    type: Number,
    required: true,
  },
  freelancerName: {
    type: String,
    required: true,
  },
  clientName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-progress', 'completed'],
    default: 'in-progress', // Changed default to 'in-progress'
  },
  submissions: [{
    week: {
      type: String,
      required: true,
    },
    submission: {
      type: String, // File path or URL
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Project', projectSchema);