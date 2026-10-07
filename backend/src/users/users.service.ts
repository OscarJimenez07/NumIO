import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Quien hace la acción, tal como lo deja JwtStrategy en req.user. */
export interface Actor {
  userId: string;
  role: Role;
}

// Sin letras que se confundan al dictarlas o copiarlas (l/1, o/0).
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';

const CAMPOS = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  provider: true,
  mustChangePassword: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      select: { ...CAMPOS, passwordHash: true },
      orderBy: { createdAt: 'desc' },
    });
    // El hash nunca sale del servidor: solo si la cuenta tiene contraseña.
    return users.map(({ passwordHash, ...u }) => ({ ...u, tieneContrasena: passwordHash !== null }));
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: CAMPOS });
  }

  /**
   * Reglas comunes a cambiar el rol y restablecer la contraseña: nadie se
   * gestiona a sí mismo desde aquí, y un docente no toca cuentas de
   * administrador.
   */
  private async objetivo(actor: Actor, id: string) {
    if (id === actor.userId) {
      throw new BadRequestException('No puedes hacer esto con tu propia cuenta.');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Ese usuario no existe.');
    if (user.role === Role.ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Solo un administrador puede modificar a otro administrador.');
    }
    return user;
  }

  async cambiarRol(actor: Actor, id: string, role: Role) {
    await this.objetivo(actor, id);
    if (role === Role.ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Solo un administrador puede nombrar administradores.');
    }
    return this.prisma.user.update({ where: { id }, data: { role }, select: CAMPOS });
  }

  /**
   * Pone una contraseña temporal a quien olvidó la suya: la que escriba el
   * docente o, si no escribe ninguna, una generada. El docente se la entrega
   * al estudiante; al entrar con ella
   * la plataforma le obliga a elegir una nueva. Las sesiones abiertas de esa
   * cuenta se cierran.
   */
  async restablecerContrasena(actor: Actor, id: string, elegida?: string) {
    await this.objetivo(actor, id);
    const letra = () => ALFABETO[randomInt(ALFABETO.length)];
    const bloque = () => Array.from({ length: 4 }, letra).join('');
    const temporal = elegida ?? `${bloque()}-${bloque()}`;

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(temporal, 10),
        mustChangePassword: true,
        passwordChangedAt: new Date(),
      },
    });
    return { passwordTemporal: temporal };
  }
}
