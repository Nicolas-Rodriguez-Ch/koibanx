import { Request, Response, NextFunction } from 'express';
import {
  requirePermission,
  requireReadPermission,
  requireWritePermission,
} from '../../src/middleware/apiPermissionMiddleware';
import { READ_API_KEY, ADMIN_API_KEY } from '../../constants/secrets';

describe('API Permission Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      header: jest.fn(),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  describe('requirePermission', () => {
    it('should return 401 if no API key is provided', () => {
      (mockRequest.header as jest.Mock).mockReturnValue(undefined);

      const middleware = requirePermission('read');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if an invalid API key is provided', () => {
      (mockRequest.header as jest.Mock).mockReturnValue('invalid-key');

      const middleware = requirePermission('read');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 if permission is not granted for the key', () => {
      (mockRequest.header as jest.Mock).mockReturnValue(READ_API_KEY);

      const middleware = requirePermission('write');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Permission denied: write permission required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() if permission is granted', () => {
      (mockRequest.header as jest.Mock).mockReturnValue(ADMIN_API_KEY);

      const middleware = requirePermission('write');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('requireReadPermission', () => {
    it('should allow read access with read API key', () => {
      (mockRequest.header as jest.Mock).mockReturnValue(READ_API_KEY);

      requireReadPermission(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow read access with admin API key', () => {
      (mockRequest.header as jest.Mock).mockReturnValue(ADMIN_API_KEY);

      requireReadPermission(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('requireWritePermission', () => {
    it('should deny write access with read API key', () => {
      (mockRequest.header as jest.Mock).mockReturnValue(READ_API_KEY);

      requireWritePermission(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow write access with admin API key', () => {
      (mockRequest.header as jest.Mock).mockReturnValue(ADMIN_API_KEY);

      requireWritePermission(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
