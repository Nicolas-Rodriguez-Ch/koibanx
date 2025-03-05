import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/* istanbul ignore next */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .xlsx files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

export { storage, fileFilter, upload };
