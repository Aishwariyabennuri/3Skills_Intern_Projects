const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (jpeg, png, webp, gif) are allowed.'));
  },
});

module.exports = upload;

/*
NOTE: This uses local disk storage for simplicity so the app works with zero
external config. For production, swap this out for Cloudinary/S3:
  - npm install cloudinary multer-storage-cloudinary
  - replace `storage` above with a CloudinaryStorage instance
  - store the returned secure_url on the document instead of a local path
*/
