import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered and JWT tokens returned' })
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const deviceId = req.headers['x-device-id'];
    const deviceType = req.headers['x-device-type'];

    return this.authService.register(dto, {
      ip,
      userAgent,
      deviceId,
      deviceType,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and return JWT tokens' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const deviceId = req.headers['x-device-id'];
    const deviceType = req.headers['x-device-type'];

    return this.authService.login(dto, {
      ip,
      userAgent,
      deviceId,
      deviceType,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and retrieve new access token' })
  @ApiResponse({ status: 200, description: 'Tokens successfully rotated' })
  async refresh(@Body() dto: RefreshDto, @Req() req: any) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    return this.authService.refresh(dto.refreshToken, { ip, userAgent });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate current session and refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
