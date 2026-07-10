import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { serverConfig } from './config';
import { MAX_REQUEST_BODY_LIMIT } from './lib/canvasLimits';
import { openDatabase, initializeDatabase, closeDatabase } from './lib/database';
import { runMigrations } from './lib/migrations';
import apiRoutes from './routes';
import logger from './utils/logger';

const app = express();
const PORT = serverConfig.port;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: MAX_REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_BODY_LIMIT }));

app.use('/api', apiRoutes);

app.use(
  (
    err: Error & { status?: number; statusCode?: number; type?: string },
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    logger.error('Unhandled error:', err);
    const status = err.status ?? err.statusCode ?? 500;

    if (err.type === 'entity.too.large' || status === 413) {
      return res.status(413).json({
        success: false,
        message: '单次上传或保存请求不能超过 500MB',
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
    });
  }
);

const startServer = async () => {
  try {
    await openDatabase();
    logger.info('Database connection established');

    await initializeDatabase();
    logger.info('Database initialized');

    await runMigrations();
    logger.info('Migrations complete');

    app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
    });

    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      await closeDatabase();
      logger.info('Database connection closed');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down server...');
      await closeDatabase();
      logger.info('Database connection closed');
      process.exit(0);
    });

    process.on('uncaughtException', function (err) {
      logger.error('Unhandled Exception:', err);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
