const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'CLIENT'],
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  // Internal flag: set to true when passwordHash already contains a bcrypt hash
  _passwordPreHashed: {
    type: Boolean,
    default: false,
    select: false
  },
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active'
  },
  tokenVersion: {
    type: Number,
    default: 0
  },
  devicePolicy: {
    enabled: {
      type: Boolean,
      default: true
    },
    maxDevices: {
      type: Number,
      default: 1
    }
  },
  expirySettings: {
    warningDays: {
      type: Number,
      default: 3
    }
  },
  notes: String,
  lastLoginAt: Date,
  lastLoginIp: String
}, {
  timestamps: true
});

// Hash password before saving — skip if already hashed (flag set by bootstrapAdmin)
userSchema.pre('save', async function() {
  if (!this.isModified('passwordHash')) return;
  if (this._passwordPreHashed) {
    // Password was pre-hashed by caller; clear the flag and skip hashing
    this._passwordPreHashed = undefined;
    return;
  }
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Force logout by incrementing token version
userSchema.methods.forceLogout = async function() {
  this.tokenVersion += 1;
  await this.save();
  return this.tokenVersion;
};

// Check if user has admin privileges
userSchema.methods.isAdmin = function() {
  return ['SUPER_ADMIN', 'ADMIN'].includes(this.role);
};

// Remove sensitive fields from JSON response
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.tokenVersion;
  delete obj._passwordPreHashed;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
