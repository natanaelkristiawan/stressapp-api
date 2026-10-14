import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import {
  EmailDto,
  RefreshDto,
  LoginDto,
  OtpRequestDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './member-auth.dto';
import { MemberAuthService } from './member-auth.service';

@ApiTags('Member authentication')
@Controller('member-auth')
export class MemberAuthController {
  /** Receives the member authentication business service.
   * @returns A controller instance.
   */
  constructor(private readonly auth: MemberAuthService) {}
  /** Extracts an access credential from the Authorization header.
   * @returns The bearer token; missing/malformed headers throw 401.
   */
  private token(header?: string) {
    if (!header?.startsWith('Bearer '))
      throw new UnauthorizedException('Sesi tidak valid.');
    return header.slice(7);
  }
  /** Applies the public auth request limit to the direct client IP.
   * @returns Promise<void>; exhausted limits throw 429.
   */
  private limit(req: Request) {
    return this.auth.limit('ip', req.ip || 'unknown', 60, 900);
  }
  /** Validates and forwards a registration request.
   * @returns A generic OTP delivery notice.
   */
  @Post('register') async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ) {
    await this.limit(req);
    return this.auth.register(dto);
  }
  /** Validates and forwards email/password login.
   * @returns Access/refresh credentials and the public member identity.
   */
  @Post('login') @HttpCode(200) async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ) {
    await this.limit(req);
    return this.auth.login(dto);
  }
  /** Validates a refresh credential and requests atomic rotation.
   * @returns A renewed JWT/refresh pair with expiry timestamps.
   */
  @Post('refresh') @HttpCode(200) async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
  ) {
    await this.limit(req);
    return this.auth.refresh(dto.refreshToken);
  }
  /** Requests a recovery OTP without revealing account existence.
   * @returns A generic delivery notice.
   */
  @Post('forgot-password') @HttpCode(200) async forgot(
    @Body() dto: EmailDto,
    @Req() req: Request,
  ) {
    await this.limit(req);
    return this.auth.sendOtp(dto.email, 'recovery');
  }
  /** Requests another OTP for an explicitly validated purpose.
   * @returns A generic delivery notice or a throttling/delivery error.
   */
  @Post('otp/send') @HttpCode(200) async send(
    @Body() dto: OtpRequestDto,
    @Req() req: Request,
  ) {
    await this.limit(req);
    return this.auth.sendOtp(dto.email, dto.purpose);
  }
  /** Validates the OTP and forwards its single-use verification.
   * @returns A registration notice or password-reset proof.
   */
  @Post('otp/verify') @HttpCode(200) async verify(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
  ) {
    await this.limit(req);
    return this.auth.verify(dto);
  }
  /** Validates recovery proof and the new password.
   * @returns A password-reset confirmation.
   */
  @Post('reset-password') @HttpCode(200) async reset(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    await this.limit(req);
    return this.auth.reset(dto.resetToken, dto.password);
  }
  /** Resolves the authenticated member from the access JWT.
   * @returns The public member identity.
   */
  @Get('me') me(@Headers('authorization') header?: string) {
    return this.auth.authenticate(this.token(header));
  }
  /** Revokes the session identified by the supplied access JWT.
   * @returns A logout confirmation.
   */
  @Post('logout') @HttpCode(200) logout(
    @Headers('authorization') header?: string,
  ) {
    return this.auth.logout(this.token(header));
  }
}
