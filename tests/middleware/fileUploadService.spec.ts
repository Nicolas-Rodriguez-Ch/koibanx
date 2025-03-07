import { Request } from 'express';
import { FileFilterCallback } from 'multer';

import { fileFilter, storage } from '../../src/middleware/fileUploadService';

describe('File Upload Service', () => {
  describe('File Filter', () => {
    it('should accept xlsx files', () => {
      const callback = jest.fn();
      const mockFile = {
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as Express.Multer.File;

      fileFilter(
        {} as Request,
        mockFile,
        callback as unknown as FileFilterCallback
      );

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should reject non-xlsx files', () => {
      const callback = jest.fn();
      const mockFile = { mimetype: 'application/pdf' } as Express.Multer.File;

      fileFilter(
        {} as Request,
        mockFile,
        callback as unknown as FileFilterCallback
      );

      expect(callback).toHaveBeenCalledTimes(1);

      const [error, allowed] = callback.mock.calls[0];

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(
        'Invalid file type. Only .xlsx files are allowed.'
      );

      expect(allowed).toBeFalsy();
    });
  });
});
