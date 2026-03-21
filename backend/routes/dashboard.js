// routes/dashboard.js
const router = require('express').Router();
const ctrl   = require('../controllers/dashboardController');
const { authenticate, requireRoles } = require('../middlewares/auth');

router.use(authenticate);
router.get('/zone',                    requireRoles('zone_admin','master_admin'), ctrl.getZoneDashboard);
router.get('/master',                  requireRoles('master_admin'), ctrl.getMasterDashboard);
router.get('/centre/:centre_code',     requireRoles('master_admin','zone_admin'), ctrl.getCentreDetail);

module.exports = router;
