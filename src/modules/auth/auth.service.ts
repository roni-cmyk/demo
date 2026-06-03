import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { SessionRepository } from './session.repository';
import { HashUtil } from '../../shared/utils/hash.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async register(
    dto: RegisterDto,
    meta: { ip?: string; userAgent?: string; deviceId?: string; deviceType?: string },
  ) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await HashUtil.hash(dto.password);
    const user = await this.userService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roles: {
        connect: [{ name: 'USER' }],
      },
    });

    return this.generateTokensAndCreateSession(user.id, meta);
  }

  async login(
    dto: LoginDto,
    meta: { ip?: string; userAgent?: string; deviceId?: string; deviceType?: string },
  ) {
    const user = await this.userService.findByEmailWithRoles(dto.email);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await HashUtil.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This user account has been deactivated');
    }

    return this.generateTokensAndCreateSession(user.id, meta);
  }

  async logout(refreshToken: string) {
    const tokenRecord = await this.refreshTokenRepository.findByToken(refreshToken);
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke current token
    await this.refreshTokenRepository.revokeToken(tokenRecord.id);

    // Deactivate session if match exists
    // Deactivate all user sessions as a clean logout or select specific one based on token id
    await this.sessionRepository.deactivateAllUserSessions(tokenRecord.userId);

    return { success: true, message: 'Logged out successfully' };
  }

  async refresh(refreshToken: string, meta: { ip?: string; userAgent?: string }) {
    const tokenRecord = await this.refreshTokenRepository.findByToken(refreshToken);
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection
    if (tokenRecord.isUsed || tokenRecord.isRevoked) {
      // Security breach! Revoke all tokens for this user immediately!
      await this.refreshTokenRepository.revokeAllUserTokens(tokenRecord.userId);
      await this.sessionRepository.deactivateAllUserSessions(tokenRecord.userId);
      throw new UnauthorizedException('Token reuse detected. All sessions revoked.');
    }

    // Verify token expiration
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Mark current token as used
    await this.refreshTokenRepository.update(tokenRecord.id, { isUsed: true });

    // Generate new tokens
    return this.generateTokensAndCreateSession(tokenRecord.userId, {
      ...meta,
      parentTokenId: tokenRecord.id,
    });
  }

  private async generateTokensAndCreateSession(
    userId: string,
    meta: {
      ip?: string;
      userAgent?: string;
      deviceId?: string;
      deviceType?: string;
      parentTokenId?: string;
    },
  ) {
    const accessSecret = this.configService.get<string>('auth.jwtAccessSecret');
    const refreshSecret = this.configService.get<string>('auth.jwtRefreshSecret');
    const accessExpires = this.configService.get<string>('auth.jwtAccessExpires');
    const refreshExpires = this.configService.get<string>('auth.jwtRefreshExpires');

    const payload = { sub: userId };

    const [accessToken, refreshTokenString] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpires as JwtSignOptions['expiresIn'],
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpires as JwtSignOptions['expiresIn'],
      }),
    ]);

    // Parse refresh token duration
    const refreshDuration = refreshExpires === '7d' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + refreshDuration);

    // Save refresh token record
    const tokenRecord = await this.refreshTokenRepository.create({
      token: refreshTokenString,
      expiresAt,
      user: { connect: { id: userId } },
      parentTokenId: meta.parentTokenId || null,
    });

    // Create session record
    const sessionDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
    await this.sessionRepository.create({
      deviceId: meta.deviceId || null,
      deviceType: meta.deviceType || null,
      ipAddress: meta.ip || null,
      userAgent: meta.userAgent || null,
      expiresAt: new Date(Date.now() + sessionDuration),
      user: { connect: { id: userId } },
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
    };
  }
}
