import { env } from './env';
import path from 'path';

export const serverConfig = {
  port: env.PORT || 3001,
  nodeEnv: env.NODE_ENV || 'development',
  isDev: env.NODE_ENV !== 'production',
  dbPath: env.DB_PATH,
  isLoginEnabled: env.LOGIN_PASSWORD.trim().length > 0,
  loginPassword: env.LOGIN_PASSWORD,
  loginSessionSecret:
    env.LOGIN_SESSION_SECRET || `${env.LOGIN_PASSWORD || 'infinite-canvas'}:session`,
};

export const dbConfig = {
  dbPath: serverConfig.dbPath,
  schemaPath: path.join(process.cwd(), 'src', 'lib', 'schema.sql'),
};

export * from './env';
