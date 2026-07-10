import { NextFunction, Request, Response } from 'express';
import { serverConfig } from '../config';
import { AUTH_COOKIE_NAME, getCookieValue, verifySessionToken } from '../utils/auth';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!serverConfig.isLoginEnabled || req.method === 'OPTIONS') {
    return next();
  }

  const token = getCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);

  if (token && verifySessionToken(token, serverConfig.loginSessionSecret)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: '请先登录',
  });
};
