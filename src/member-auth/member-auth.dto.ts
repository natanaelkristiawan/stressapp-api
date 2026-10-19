import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator';

/** Builds the validator that prevents bcrypt truncation of UTF-8 passwords.
 * @returns A class-validator property decorator limiting passwords to 72 bytes.
 */
function PasswordBytes() {
  return ValidateBy({
    name: 'passwordBytes',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72,
      defaultMessage: () => 'Password maksimal 72 byte.',
    },
  });
}

export class EmailDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
}
export class LoginDto extends EmailDto {
  @IsString() @Length(1, 72) @PasswordBytes() password: string;
  @IsOptional() @IsBoolean() rememberMe?: boolean;
}
export class RegisterDto extends EmailDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name: string;
  @IsString()
  @Length(8, 72)
  @PasswordBytes()
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])[\s\S]+$/, {
    message:
      'Password harus 8–72 karakter, mengandung huruf, angka, dan simbol.',
  })
  password: string;
  @Equals(true) agreeTerms: boolean;
}
export class OtpRequestDto extends EmailDto {
  @IsIn(['registration', 'recovery']) purpose: 'registration' | 'recovery';
}
export class VerifyOtpDto extends OtpRequestDto {
  @ValidateIf((dto: VerifyOtpDto) => dto.purpose === 'registration')
  @IsString()
  @Length(8, 72)
  @PasswordBytes()
  password?: string;
  @IsString() @Matches(/^\d{4}$/) code: string;
}
export class ResetPasswordDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) resetToken: string;
  @IsString()
  @Length(8, 72)
  @PasswordBytes()
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])[\s\S]+$/)
  password: string;
}

export class RefreshDto {
  @IsString() @Matches(/^refresh_[a-f0-9]{64}$/) refreshToken: string;
}

/** Cookie-only requests accept an empty body; client-supplied credentials are rejected. */
export class WebSessionDto {}
