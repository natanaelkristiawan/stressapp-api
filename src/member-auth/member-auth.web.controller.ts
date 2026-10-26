import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';
import { getCorsOptions } from '../common/config/cors';
import {
  GoogleLoginDto,
  LoginDto,
  VerifyOtpDto,
  WebSessionDto,
} from './member-auth.dto';
import { MemberAuthService } from './member-auth.service';

const REFRESH_COOKIE = 'member_refresh';
const COOKIE_PATH = '/member-auth/web';
type IssuedSession = Awaited<ReturnType<MemberAuthService['login']>>;

@ApiTags('Member authentication')
@Controller('member-auth/web')
export class MemberWebAuthController {
  /** Reuses member authentication and configured trusted frontend origins. */
  constructor(
    private readonly auth: MemberAuthService,
    private readonly config: ConfigService,
  ) {}

  /** Rejects cross-site form requests before any cookie/session mutation and applies existing limits. */
  private async validateRequest(request: Request): Promise<void> {
    const allowedOrigins = getCorsOptions(
      this.config.get<string>('CORS_ORIGINS'),
    ).origin;
    if (
      !request.headers.origin ||
      !allowedOrigins.includes(request.headers.origin) ||
      request.headers['x-member-web'] !== '1'
    ) {
      throw new ForbiddenException('Browser origin is not allowed.');
    }
    await this.auth.limit('ip', request.ip || 'unknown', 60, 900);
  }

  /** Returns host-only cookie flags; local HTTP development is supported outside production. */
  private cookieOptions(request: Request): CookieOptions {
    return {
      httpOnly: true,
      secure:
        this.config.get<string>('NODE_ENV') === 'production' ||
        request.headers.origin?.startsWith('https://') === true,
      sameSite: 'lax',
      path: COOKIE_PATH,
    };
  }

  /** Reads exactly one valid cookie without accepting refresh credentials from the request body. */
  private refreshToken(request: Request): string {
    const matches = (request.headers.cookie || '')
      .split(';')
      .map((cookie) => cookie.trim())
      .filter((cookie) => cookie.startsWith(`${REFRESH_COOKIE}=`));
    const token = matches[0]?.slice(REFRESH_COOKIE.length + 1);
    if (matches.length !== 1 || !/^refresh_[a-f0-9]{64}$/.test(token || '')) {
      throw new UnauthorizedException('Silakan masuk kembali.');
    }
    return token;
  }

  /** Persists only the refresh credential in an HttpOnly cookie and returns public session fields. */
  private writeSession(
    session: IssuedSession,
    request: Request,
    response: Response,
  ) {
    response.setHeader('Cache-Control', 'private, no-store');
    response.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.cookieOptions(request),
      expires: new Date(session.refreshExpiresAt),
    });
    return {
      token: session.token,
      expiresAt: session.expiresAt,
      refreshExpiresAt: session.refreshExpiresAt,
      member: session.member,
    };
  }

  /** Logs a browser in using the same password validation/session lifetime as native clients. */
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.validateRequest(request);
    return this.writeSession(await this.auth.login(input), request, response);
  }

  /** Logs a browser in using a verified Google OAuth ID token and writes the HttpOnly refresh cookie. */
  @Post('google')
  @HttpCode(200)
  async googleLogin(
    @Body() input: GoogleLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.validateRequest(request);
    return this.writeSession(
      await this.auth.loginWithGoogle(input),
      request,
      response,
    );
  }

  /** Verifies registration into a cookie session; recovery still returns only reset proof. */
  @Post('otp/verify')
  @HttpCode(200)
  async verify(
    @Body() input: VerifyOtpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.validateRequest(request);
    response.setHeader('Cache-Control', 'private, no-store');
    const result = await this.auth.verify(input);
    if ('refreshToken' in result) {
      return this.writeSession(result, request, response);
    }
    return result;
  }

  /** Restores a browser session or renews expired access, rotating the cookie without extending its lifetime. */
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() _input: WebSessionDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.validateRequest(request);
    response.setHeader('Cache-Control', 'private, no-store');
    // Leave the cookie intact on failure: another tab may already have rotated it.
    const session = await this.auth.refresh(this.refreshToken(request));
    return this.writeSession(session, request, response);
  }

  /** Revokes the cookie's session even if access expired, then clears the browser cookie. */
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body() _input: WebSessionDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.validateRequest(request);
    response.setHeader('Cache-Control', 'private, no-store');
    try {
      await this.auth.logoutByRefreshToken(this.refreshToken(request));
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }
    }
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions(request));
    return { message: 'Berhasil keluar.' };
  }
}
