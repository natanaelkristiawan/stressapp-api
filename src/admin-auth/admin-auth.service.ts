// src/auth/auth.service.ts
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserAdmin } from '../entity/user-admin.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ChangePasswordDto } from './dtos/auth.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(UserAdmin, 'mimate')
    private usersRepository: Repository<UserAdmin>,
  ) {}

  async validateUser(email: string, password: string): Promise<UserAdmin> {
    const user = await this.usersRepository.findOne({ where: { email }, relations: ['userMimate'] });
    if (user?.userMimate && await bcrypt.compare(password, user.password)) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: UserAdmin): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'https://mimate.otesuto.com/admin-auth/login',
      aud: 'cms',
      kind: 'admin-access',
      iat: now,
      exp: now + 86400, // 1 day
      nbf: now,
      jti: uuidv4().slice(0, 16),
      email: user.email,
      phone: '', // You can load this from DB if available
      sub: require('crypto').createHash('sha256').update(user.email).digest('hex'),
      // Local CMS profile ID; no external identity database is consulted.
      id: user.userMimate.id,
    };
 
    return this.jwtService.sign(payload)
  }

  // change password
    async changePassword(dto: ChangePasswordDto, memberId: number): Promise<{ message: string }> {
    const { oldPassword, newPassword, confirmNewPassword } = dto;



    // check if old password is correct
    const user = await this.usersRepository.findOne({where: {backup_member_id: memberId}});

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // check if new password and confirm new password are the same
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('New password and confirm new password are not the same');
    }
    
    // check if old password is correct
    if (!(await bcrypt.compare(oldPassword, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // update password
    user.password = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);

    // return success
    return {
      message: 'Password changed successfully',
    };
  }
}
