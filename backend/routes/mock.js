// routes/mock.js
const router = require('express').Router();
const ctrl   = require('../controllers/mockController');
const { authenticate, requireRoles } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(authenticate);
router.post('/checklist',              requireRoles('server_manager'), ctrl.submitChecklist);
router.get('/checklist/:centre_code',  ctrl.getChecklist);
router.post('/photos',                 requireRoles('server_manager'), upload.single('photo'), ctrl.uploadPhotos);
router.get('/photos/:centre_code',     ctrl.getPhotos);

module.exports = router;
