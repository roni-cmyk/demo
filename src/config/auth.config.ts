import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  jwtAccessSecret: string;
  jwtAccessExpires: string;
  jwtRefreshSecret: string;
  jwtRefreshExpires: string;
  bcryptSaltRounds: number;
}

export default registerAs('auth', (): AuthConfig => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'super_secret_access_key',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  bcryptSaltRounds: process.env.BCRYPT_SALT_ROUNDS ? parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) : 12,
}));
