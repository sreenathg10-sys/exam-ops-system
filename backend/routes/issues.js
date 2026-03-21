// routes/issues.js
const router = require('express').Router();
const ctrl   = require('../controllers/issuesController');
const { authenticate, requireRoles } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(authenticate);
router.post('/',                       requireRoles('server_manager','event_manager','biometric_staff'), upload.array('photos', 5), ctrl.reportIssue);
router.get('/centre/:centre_code',     ctrl.getCentreIssues);
router.get('/all',                     requireRoles('master_admin','zone_admin'), ctrl.getAllIssues);
router.patch('/:id/status',            requireRoles('master_admin','zone_admin'), ctrl.updateIssueStatus);

module.exports = router;
