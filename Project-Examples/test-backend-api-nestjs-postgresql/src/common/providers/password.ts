import { SALT_ROUNDS } from '@/common/constants';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(Number(SALT_ROUNDS));
    return bcrypt.hash(password, salt);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
