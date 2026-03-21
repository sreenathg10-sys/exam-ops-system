// routes/reports.js
const router = require('express').Router();
const ctrl   = require('../controllers/reportsController');
const { authenticate, requireRoles } = require('../middlewares/auth');

router.use(authenticate, requireRoles('master_admin'));
router.get('/zone-summary',    ctrl.getZoneSummaryExcel);
router.get('/centre-detail',   ctrl.getCentreDetailExcel);

module.exports = router;
