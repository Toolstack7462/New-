const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  actorRole: {
    type: String,
    enum: ['ADMIN', 'SUPER_ADMIN', 'CLIENT', 'SYSTEM', 'SUPPORT'],
    required: true
  },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:  { type: String, required: true },
  meta:    { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// FIX11: TTL changed from 24 h to 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// FIX18: Compound indexes for audit queries
activityLogSchema.index({ actorId: 1, action: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ actorId: 1, createdAt: -1 });

activityLogSchema.statics.log = async function(actorRole, actorId, action, meta = {}) {
  try {
    return this.create({ actorRole, actorId, action, meta });
  } catch (err) {
    console.error('ActivityLog.log failed:', err.message);
  }
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
