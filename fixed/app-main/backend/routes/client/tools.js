const express = require('express');
const router = express.Router();
const Tool = require('../../models/Tool');
const ToolAssignment = require('../../models/ToolAssignment');
const ActivityLog = require('../../models/ActivityLog');
const DeviceBinding = require('../../models/DeviceBinding');
const { requireAuth, requireRole } = require('../../middleware/authEnhanced');

router.use(requireAuth);
router.use(requireRole('CLIENT'));

// FIX6: Strip ALL encrypted credential fields — clients never receive raw blobs
function sanitizeToolForClient(toolObj) {
  const STRIP = ['cookiesEncrypted', 'tokenEncrypted', 'localStorageEncrypted'];
  STRIP.forEach(k => delete toolObj[k]);
  if (toolObj.credentials) {
    // Keep type/selectors/successCheck for extension config, remove encrypted payload
    delete toolObj.credentials.payloadEncrypted;
  }
  if (toolObj.sessionBundle) {
    // Keep version/bundleUpdatedAt for sync checking; strip all encrypted data
    delete toolObj.sessionBundle.cookiesEncrypted;
    delete toolObj.sessionBundle.localStorageEncrypted;
    delete toolObj.sessionBundle.sessionStorageEncrypted;
  }
  return toolObj;
}

// ─── GET / — assigned tools for client ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;

    await ToolAssignment.updateExpiredAssignments();

    const assignments = await ToolAssignment.find({
      clientId: req.userId, status: 'active'
    }).populate('toolId');

    const now = new Date();
    let tools = assignments
      .filter(a => {
        if (!a.toolId || a.toolId.status !== 'active') return false;
        if (a.startDate && a.startDate > now) return false;
        if (a.endDate   && a.endDate   < now) return false;
        return true;
      })
      .map(a => ({
        ...sanitizeToolForClient(a.toolId.toObject()),
        assignmentId: a._id,
        startDate:    a.startDate,
        endDate:      a.endDate,
        durationDays: a.durationDays
      }));

    // FIX26: Server-side filters already applied via MongoDB above — these are fallbacks
    if (search) {
      const q = search.toLowerCase().substring(0, 100);
      tools = tools.filter(t =>
        t.name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      );
    }
    if (category && category !== 'All') tools = tools.filter(t => t.category === category);

    return res.json({ success: true, tools });
  } catch (err) {
    console.error('Get client tools error:', err);
    return res.status(500).json({ error: 'Failed to fetch tools' });
  }
});

// ─── GET /:toolId — single tool detail ────────────────────────────────────────
router.get('/:toolId', async (req, res) => {
  try {
    const assignment = await ToolAssignment.findOne({
      clientId: req.userId, toolId: req.params.toolId, status: 'active'
    }).populate('toolId');

    if (!assignment) return res.status(403).json({ error: 'Access denied. Tool not assigned.' });
    if (!assignment.toolId || assignment.toolId.status !== 'active') return res.status(403).json({ error: 'Tool not available' });

    const now = new Date();
    if (assignment.startDate && assignment.startDate > now) return res.status(403).json({ error: 'Tool access not started yet' });
    if (assignment.endDate   && assignment.endDate   < now) return res.status(403).json({ error: 'Tool access has expired' });

    return res.json({
      success: true,
      tool: {
        ...sanitizeToolForClient(assignment.toolId.toObject()),
        assignmentId: assignment._id,
        startDate:    assignment.startDate,
        endDate:      assignment.endDate,
        durationDays: assignment.durationDays
      }
    });
  } catch (err) {
    console.error('Get tool details error:', err);
    return res.status(500).json({ error: 'Failed to fetch tool details' });
  }
});

module.exports = router;
