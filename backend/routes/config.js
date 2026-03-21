// routes/config.js
const router = require('express').Router();
const ctrl   = require('../controllers/configController');
const { authenticate, requireRoles } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/template',                                                    ctrl.downloadTemplate);
router.post('/import',  authenticate, requireRoles('master_admin'), upload.single('excel'), ctrl.importExcel);
router.get('/status',   authenticate, requireRoles('master_admin','zone_admin'), ctrl.getStatus);
router.get('/import-log', authenticate, requireRoles('master_admin'), ctrl.getImportLog);

module.exports = router;
