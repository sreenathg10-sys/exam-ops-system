// middlewares/upload.js
const multer = require('multer')
const path   = require('path')

// Use memory storage — no disk writes, works on Render/cloud
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedExts  = /jpeg|jpg|png|xlsx|xls/
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/jpg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '')
  if (allowedExts.test(ext) && allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type not allowed: ${path.extname(file.originalname)}`), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

module.exports = upload
