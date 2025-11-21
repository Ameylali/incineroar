import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose';

import { UnsensitiveUserData } from '../types/api';
import { MissingConfigError } from '../utils/errors';

interface AuthConfig {
  privateKey: string;
  publicKey: string;
  alg: string;
  issuer: string;
  audience: string;
  expiration: string;
}

export default class AuthService {
  config: AuthConfig;

  constructor() {
    if (!process.env.JWT_PRIVATE_KEY) {
      throw new MissingConfigError('JWT_PRIVATE_KEY');
    }
    if (!process.env.JWT_PUBLIC_KEY) {
      throw new MissingConfigError('JWT_PUBLIC_KEY');
    }
    this.config = {
      privateKey: process.env.JWT_PRIVATE_KEY,
      publicKey: process.env.JWT_PUBLIC_KEY,
      alg: 'RS256',
      issuer: 'INCINEROAR',
      audience: 'INCINEROAR',
      expiration: '1week',
    };
  }

  async createUserJwt(user: UnsensitiveUserData) {
    const {
      alg,
      privateKey: rawPK,
      issuer,
      audience,
      expiration,
    } = this.config;
    const privateKey = await importPKCS8(rawPK, 'RS256');
    const jwt = await new SignJWT({ user })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(expiration)
      .sign(privateKey);
    return jwt;
  }

  async verifyUserJwt(jwt: string) {
    const { publicKey: rawPK, issuer, audience } = this.config;
    const publicKey = await importSPKI(rawPK, 'RS256');
    try {
      const { payload } = await jwtVerify<{ user: UnsensitiveUserData }>(
        jwt,
        publicKey,
        {
          issuer,
          audience,
        },
      );
      return {
        verified: true,
        user: payload.user,
      };
    } catch (error) {
      console.error('Failed to verify jwt', error);
      return { verified: false };
    }
  }
}
