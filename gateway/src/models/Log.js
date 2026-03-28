const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  ip: String,
  endpoint: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: Number,
  latency: Number,
  decision: {
    type: String,
    enum: ['allowed', 'blocked']
  },
  mlLabel: {
    type: String,
    required: false,
  },
});

//indexes for fast queries
logSchema.index({ ip: 1 });
logSchema.index({ timestamp: 1 });

module.exports = mongoose.model('Log', logSchema);