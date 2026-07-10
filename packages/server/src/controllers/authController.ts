import { Request, Response } from 'express';
import { serverConfig } from '../config';
import {
  clearSessionCookie,
  createSessionCookie,
  createSessionToken,
  AUTH_COOKIE_NAME,
  getCookieValue,
  verifySessionToken,
} from '../utils/auth';

const getAuthStatus = (req: Request) => {
  if (!serverConfig.isLoginEnabled) {
    return {
      enabled: false,
      authenticated: true,
    };
  }

  const token = getCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);

  return {
    enabled: true,
    authenticated:
      !!token && verifySessionToken(token, serverConfig.loginSessionSecret),
  };
};

export const authController = {
  status(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      data: getAuthStatus(req),
    });
  },

  login(req: Request, res: Response) {
    const { password } = req.body as { password?: string };

    if (!serverConfig.isLoginEnabled) {
      return res.status(200).json({
        success: true,
        data: {
          enabled: false,
          authenticated: true,
        },
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: '请输入访问密码',
      });
    }

    if (password !== serverConfig.loginPassword) {
      return res.status(401).json({
        success: false,
        message: '密码错误',
      });
    }

    const token = createSessionToken(serverConfig.loginSessionSecret);
    res.setHeader('Set-Cookie', createSessionCookie(token));

    return res.status(200).json({
      success: true,
      data: {
        enabled: true,
        authenticated: true,
      },
    });
  },

  logout(req: Request, res: Response) {
    res.setHeader('Set-Cookie', clearSessionCookie());

    return res.status(200).json({
      success: true,
      data: {
        enabled: serverConfig.isLoginEnabled,
        authenticated: false,
      },
    });
  },
};
