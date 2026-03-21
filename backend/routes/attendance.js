// routes/attendance.js
const router  = require('express').Router();
const ctrl    = require('../controllers/attendanceController');
const { authenticate, requireRoles } = require('../middlewares/auth');
const upload  = require('../middlewares/upload');

const FIELD_ROLES = ['server_manager','event_manager','biometric_staff'];

router.use(authenticate);
router.get('/my',                              ctrl.getMyAttendance);
router.post('/report',                         requireRoles(...FIELD_ROLES), ctrl.markReported);
router.post('/selfie',                         requireRoles(...FIELD_ROLES), upload.single('selfie'), ctrl.uploadSelfie);
router.post('/geo',                            requireRoles(...FIELD_ROLES), ctrl.saveGeoTag);
router.post('/submit',                         requireRoles(...FIELD_ROLES), ctrl.submitAttendance);
router.get('/centre/:centre_code',             ctrl.getCentreAttendance);

module.exports = router;
