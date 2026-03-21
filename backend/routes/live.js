// routes/live.js
const router = require('express').Router();
const ctrl   = require('../controllers/liveController');
const { authenticate, requireRoles } = require('../middlewares/auth');

router.use(authenticate);
router.post('/checklist',              requireRoles('server_manager'), ctrl.submitChecklist);
router.get('/checklist/:centre_code',  ctrl.getChecklist);
router.post('/batch',                  requireRoles('server_manager'), ctrl.submitBatch);
router.get('/batch/:centre_code',      ctrl.getBatchAttendance);

module.exports = router;
