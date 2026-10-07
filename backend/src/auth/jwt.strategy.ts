import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'change-me',
    });
  }

  /**
   * El rol se lee de la base y no del token: así un cambio de rol hecho por
   * el docente surte efecto de inmediato, no cuando la sesión caduque. Por la
   * misma razón, las sesiones abiertas antes del último cambio de contraseña
   * dejan de valer.
   */
  async validate(payload: JwtPayload & { iat?: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, passwordChangedAt: true },
    });
    if (!user) return null;
    if (
      user.passwordChangedAt &&
      (payload.iat ?? 0) < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      return null;
    }
    return { userId: user.id, email: user.email, role: user.role };
  }
}
