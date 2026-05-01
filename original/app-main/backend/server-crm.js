const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '.env') });

// ============================================================================
// STARTUP ENVIRONMENT VALIDATION — fail hard if critical vars are missing
// ============================================================================
const REQUIRED_ENV = {
  JWT_SECRET:                { minLength: 32 },
  JWT_REFRESH_SECRET:        { minLength: 32 },
  COOKIES_ENCRYPTION_KEY:    { minLength: 64 },
  MONGO_URL:                 { minLength: 10 },
  INITIAL_ADMIN_EMAIL:       { minLength: 5  },
  INITIAL_ADMIN_PASSWORD:    { minLength: 12 },
};

let startupFailed = false;
Object.entries(REQUIRED_ENV).forEach(([key, opts]) => {
  const val = process.env[key];
  if (!val) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    startupFailed = true;
  } else if (opts.minLength && val.length < opts.minLength) {
    console.error(`FATAL: ${key} must be at least ${opts.minLength} characters (currently ${val.length})`);
    startupFailed = true;
  }
});

if (startupFailed) {
  console.error('\nServer cannot start due to missing or weak environment variables.');
  console.error('Copy .env.example to .env and fill in all required values.\n');
  process.exit(1);
}

// Validate COOKIES_ENCRYPTION_KEY is valid hex
if (!/^[0-9a-fA-F]{64}$/.test(process.env.COOKIES_ENCRYPTION_KEY)) {
  console.error('FATAL: COOKIES_ENCRYPTION_KEY must be exactly 64 hexadecimal characters.');
  console.error('Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

console.log('✅ All required environment variables validated.');

const app = express();

// ============================================================================
// CORS CONFIGURATION — explicit allowlist via environment variable
// ============================================================================
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];

if (ALLOWED_ORIGINS.length === 0) {
  console.warn('⚠️  WARNING: ALLOWED_ORIGINS is not set. No browser origins will be permitted.');
  console.warn('   Set ALLOWED_ORIGINS in .env, e.g.: https://app.example.com,http://localhost:3000');
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow server-to-server calls (no Origin header)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      console.log(`✅ CORS: Allowed origin: ${origin}`);
      return callback(null, true);
    }

    console.warn(`⚠️  CORS: Blocked origin: ${origin}`);
    return callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ============================================================================
// PERSISTENT DATABASE CONNECTION WITH DETAILED LOGGING
// ============================================================================
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME   = process.env.DB_NAME || 'toolstack_crm';
const FULL_MONGO_URL = `${MONGO_URL}/${DB_NAME}`;

console.log('\n' + '='.repeat(70));
console.log('🔌 MONGODB CONNECTION DETAILS');
console.log('='.repeat(70));
console.log(`Database: ${DB_NAME}`);
console.log(`Full URL: ${FULL_MONGO_URL.replace(/:\/\/([^:]+:[^@]+)@/, '://<credentials>@')}`);
console.log('='.repeat(70) + '\n');

mongoose.connect(FULL_MONGO_URL, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(async () => {
  console.log('✅ MongoDB connected successfully!');
  console.log(`   - Host: ${mongoose.connection.host}`);
  console.log(`   - Database: ${mongoose.connection.db.databaseName}`);
  console.log(`   - Connection State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);

  // Add indexes for performance
  await ensureIndexes();

  // Bootstrap admin on first startup
  await bootstrapAdmin();
})
.catch(err => {
  console.error('❌ MongoDB connection FAILED:', err.message);
  console.error('   Please check your MONGO_URL and DB_NAME in .env file');
  process.exit(1);
});

// ============================================================================
// ENSURE DATABASE INDEXES
// ============================================================================
async function ensureIndexes() {
  try {
    const db = mongoose.connection.db;
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('tools').createIndex({ _id: 1 });
    await db.collection('loginattempts').createIndex({ toolId: 1, createdAt: -1 });
    await db.collection('sessionbundles').createIndex({ toolId: 1 }, { unique: true });
    console.log('✅ Database indexes ensured.');
  } catch (err) {
    // Index creation errors are non-fatal (they may already exist)
    console.warn('⚠️  Index creation warning:', err.message);
  }
}

// ============================================================================
// ADMIN BOOTSTRAP — with proper bcrypt hashing
// ============================================================================
async function bootstrapAdmin() {
  try {
    const User = require('./models/User');

    const adminCount = await User.countDocuments({
      role: { $in: ['SUPER_ADMIN', 'ADMIN'] }
    });

    if (adminCount === 0) {
      console.log('\n⚠️  No admin accounts found in database!');
      console.log('📝 Creating default admin account...\n');

      const adminEmail    = process.env.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
      const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
      const adminName     = process.env.INITIAL_ADMIN_NAME || 'Super Admin';

      // Explicitly hash the password here (User model pre-save hook also does this,
      // but we are defensive — we never pass a raw password as passwordHash)
      const SALT_ROUNDS = 12;
      const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

      const admin = await User.create({
        email: adminEmail,
        fullName: adminName,
        passwordHash: hashedPassword,
        _passwordPreHashed: true,   // Tell pre-save hook this is already a bcrypt hash
        role: 'SUPER_ADMIN',
        status: 'active',
        devicePolicy: {
          enabled: false,
          maxDevices: 10
        }
      });

      console.log('✅ Default admin created successfully!');
      console.log(`   - Email: ${admin.email}`);
      console.log(`   - Name:  ${admin.fullName}`);
      console.log(`   - Role:  ${admin.role}`);
      console.log(`   - ID:    ${admin._id}`);
      console.log('⚠️  IMPORTANT: Change the default password after first login!\n');

      const newAdminCount = await User.countDocuments({ role: { $in: ['SUPER_ADMIN', 'ADMIN'] } });
      const clientCount   = await User.countDocuments({ role: 'CLIENT' });
      console.log(`📊 Database Status: ${newAdminCount} admin(s), ${clientCount} client(s)\n`);
    } else {
      console.log(`✅ Admin accounts verified: ${adminCount} admin(s) exist in database\n`);
      const clientCount = await User.countDocuments({ role: 'CLIENT' });
      console.log(`📊 Database Status: ${adminCount} admin(s), ${clientCount} client(s)\n`);
    }

  } catch (error) {
    console.error('❌ Bootstrap error:', error.message);
    // Non-fatal — let server continue
  }
}

// Import enhanced routes
const authRoutes              = require('./routes/authEnhanced');
const publicRoutes            = require('./routes/public');
const adminToolsRoutes        = require('./routes/admin/toolsEnhanced');
const adminClientsRoutes      = require('./routes/admin/clientsEnhanced');
const adminAssignmentsRoutes  = require('./routes/admin/assignments');
const adminActivityRoutes     = require('./routes/admin/activity');
const adminBlogRoutes         = require('./routes/admin/blog');
const adminContactsRoutes     = require('./routes/admin/contacts');
const clientToolsRoutes       = require('./routes/client/tools');
const clientAssignmentsRoutes = require('./routes/client/assignmentsEnhanced');
const clientNotificationsRoutes = require('./routes/client/notifications');
const clientProfileRoutes     = require('./routes/client/profile');
const extensionRoutes         = require('./routes/extension');

// Mount routes
app.use('/api/crm/auth',             authRoutes);
app.use('/api/crm/public',           publicRoutes);
app.use('/api/crm/extension',        extensionRoutes);
app.use('/api/crm/admin/tools',      adminToolsRoutes);
app.use('/api/crm/admin/clients',    adminClientsRoutes);
app.use('/api/crm/admin/assignments',adminAssignmentsRoutes);
app.use('/api/crm/admin/activity',   adminActivityRoutes);
app.use('/api/crm/admin/blog',       adminBlogRoutes);
app.use('/api/crm/admin/contacts',   adminContactsRoutes);
app.use('/api/crm/client/tools',     clientToolsRoutes);
app.use('/api/crm/client/assignments', clientAssignmentsRoutes);
app.use('/api/crm/client/notifications', clientNotificationsRoutes);
app.use('/api/crm/client',           clientProfileRoutes);

// Health check
app.get('/api/crm/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.json({
    status: 'ok',
    service: 'ToolStack CRM',
    version: '2.0.0',
    mongodb: {
      state: dbStateMap[dbState] || 'unknown',
      host: mongoose.connection.host || 'N/A',
      database: mongoose.connection.db ? mongoose.connection.db.databaseName : 'N/A'
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Global error handler — never leak stack traces to client
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.details });
  }
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    return res.status(500).json({ error: 'Database error' });
  }

  res.status(err.status || 500).json({
    error: isDev ? (err.message || 'Internal server error') : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.CRM_PORT || 8002;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🚀 ToolStack CRM API Server');
  console.log(`${'='.repeat(60)}`);
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${DB_NAME}`);
  console.log(`${'='.repeat(60)}\n`);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
