import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'production' ? '服务发生错误' : err.message,
  });
};

export default errorHandler;
