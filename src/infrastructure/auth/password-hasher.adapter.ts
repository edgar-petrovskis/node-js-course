import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';

import { PasswordHasherPort } from '../../application/auth/ports/password-hasher.port';

const scrypt = promisify(scryptCallback);

@Injectable()
export class PasswordHasherAdapter implements PasswordHasherPort {
  async hash(value: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(value, salt, 64)) as Buffer;

    return `${salt}:${derived.toString('hex')}`;
  }

  async verify(value: string, hash: string): Promise<boolean> {
    const [salt, storedHex] = hash.split(':');

    if (!salt || !storedHex) return false;

    const derived = (await scrypt(value, salt, 64)) as Buffer;
    const stored = Buffer.from(storedHex, 'hex');

    if (stored.length !== derived.length) return false;

    return timingSafeEqual(stored, derived);
  }
}
