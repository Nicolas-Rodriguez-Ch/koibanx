import { NextFunction, Request, Response } from 'express';
import { READ_API_KEY, ADMIN_API_KEY } from '../../constants/secrets';

const API_KEYS: Record<string, { permissions: string[] }> = {
  [READ_API_KEY]: { permissions: ['read'] },
  [ADMIN_API_KEY]: { permissions: ['read', 'write'] },
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.header('X-API-KEY');
    if (!apiKey) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const keyInfo = API_KEYS[apiKey as keyof typeof API_KEYS];
    if (!keyInfo) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!keyInfo.permissions.includes(permission)) {
      res.status(403).json({
        message: `Permission denied: ${permission} permission required`,
      });
      return;
    }

    next();
  };
};

export const requireReadPermission = requirePermission('read');
export const requireWritePermission = requirePermission('write');
