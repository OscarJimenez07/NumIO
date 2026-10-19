import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthProvider, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { IdentidadMicrosoft, MicrosoftService } from './microsoft.service';
import { CodigoService } from './codigo.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly microsoft: MicrosoftService,
    private readonly codigo: CodigoService,
    private readonly config: ConfigService,
  ) {}

  /**
   * PERMITIR_CONTRASENA=false cierra el ingreso y el registro con contraseña.
   * Solo surte efecto si hay otro medio de entrar (Microsoft o código): si no,
   * dejaría a todo el mundo fuera de la plataforma.
   */
  get contrasenaPermitida(): boolean {
    const hayOtroMedio = this.microsoft.habilitado || this.codigo.habilitado;
    return !hayOtroMedio || this.config.get<string>('PERMITIR_CONTRASENA')?.trim() !== 'false';
  }

  exigirContrasenaPermitida() {
    if (!this.contrasenaPermitida) {
      throw new ForbiddenException(
        'El ingreso con contraseña está desactivado. Ingresa con tu correo institucional.',
      );
    }
  }

  async register(dto: RegisterDto) {
    this.exigirContrasenaPermitida();
    const email = dto.email.trim().toLowerCase();

    // Solo correos de la universidad: así, cuando se active el ingreso con
    // Microsoft, cada cuenta se enlaza sola con su identidad institucional.
    const permitidos = this.microsoft.dominiosPermitidos;
    const dominio = email.split('@')[1] ?? '';
    if (permitidos.length && !permitidos.some((d) => dominio === d || dominio.endsWith('.' + d))) {
      throw new BadRequestException(
        `Regístrate con tu correo institucional (${permitidos.map((d) => '@' + d).join(' o ')}).`,
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Ese correo ya tiene una cuenta. Inicia sesión.');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName?.trim() || email.split('@')[0],
        // El registro público crea siempre estudiantes. Los roles de docente y
        // administrador se asignan con DOCENTE_EMAILS y ADMIN_EMAILS.
        role: Role.STUDENT,
      },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    const token = this.signToken(user.id, user.email, user.role);
    return { user, token };
  }

  async login(dto: LoginDto) {
    this.exigirContrasenaPermitida();
    const user = await this.buscarParaIngreso(dto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Esta cuenta ingresa con el correo institucional. Usa el botón de Microsoft.',
      );
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    return this.sesion(user);
  }

  /**
   * Acepta el correo completo o solo el usuario (lo que va antes de la @), para
   * no tener que escribir el dominio. Con el usuario se busca la cuenta cuyo
   * correo empieza por «usuario@», sin suponer el dominio: así también sirve
   * para correos como …@correo.uts.edu.co. Si el usuario coincide con más de
   * una cuenta se pide el correo completo, en vez de elegir una al azar.
   */
  private async buscarParaIngreso(entrada: string) {
    const texto = entrada.trim().toLowerCase();
    if (texto.includes('@')) return this.prisma.user.findUnique({ where: { email: texto } });
    const coincidencias = await this.prisma.user.findMany({ where: { email: { startsWith: `${texto}@` } }, take: 2 });
    if (coincidencias.length > 1) {
      throw new UnauthorizedException('Hay más de una cuenta con ese usuario: escribe el correo completo.');
    }
    return coincidencias[0] ?? null;
  }

  /**
   * Canjea la identidad verificada de Microsoft por una sesión de NumIO.
   * Si la persona ya existe (por su identificador de Entra ID o por su correo)
   * se reutiliza su cuenta, de modo que conserva su historial de intentos y
   * sus puntajes del piloto; si no, se crea con rol de estudiante.
   */
  async ingresarConMicrosoft(idToken: string) {
    const identidad: IdentidadMicrosoft = await this.microsoft.verificar(idToken);
    // Si el correo figura en ADMIN_EMAILS o DOCENTE_EMAILS, ese rol manda; si
    // no, se conserva el que ya tenga la cuenta (o estudiante si es nueva).
    const rolAsignado = this.microsoft.rolPorCorreo(identidad.email);

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ microsoftOid: identidad.oid }, { email: identidad.email }] },
    });

    if (user) {
      // Enlaza la cuenta preexistente con la identidad institucional. La
      // contraseña se anula: el registro no verifica el buzón, así que quien
      // la creó pudo no ser el dueño del correo; Microsoft sí lo demuestra.
      const cambiaRol = rolAsignado !== undefined && rolAsignado !== user.role;
      if (
        cambiaRol ||
        user.passwordHash ||
        user.fullName === user.email.split('@')[0] ||
        user.microsoftOid !== identidad.oid ||
        user.provider !== AuthProvider.MICROSOFT
      ) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            microsoftOid: identidad.oid,
            provider: AuthProvider.MICROSOFT,
            passwordHash: null,
            mustChangePassword: false,
            // Quien se registró solo con el correo tiene por nombre su usuario
            // (ojavierjimenez); Microsoft trae el nombre real y se aprovecha.
            ...(user.fullName === user.email.split('@')[0] ? { fullName: identidad.nombre } : {}),
            ...(cambiaRol ? { role: rolAsignado } : {}),
          },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: identidad.email,
          fullName: identidad.nombre,
          role: rolAsignado ?? Role.STUDENT,
          provider: AuthProvider.MICROSOFT,
          microsoftOid: identidad.oid,
        },
      });
    }

    return this.sesion(user);
  }

  /**
   * Abre sesión para un correo cuyo buzón ya se comprobó con un código. Mismas
   * reglas que con Microsoft: se reutiliza la cuenta si existe y el rol sale
   * de ADMIN_EMAILS / DOCENTE_EMAILS cuando el correo figura allí.
   */
  async ingresarConCorreoVerificado(email: string, nombre?: string) {
    const rolAsignado = this.microsoft.rolPorCorreo(email);
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      // Mismo motivo que con Microsoft: el código demuestra quién es el dueño
      // del buzón, así que una contraseña puesta por otro deja de valer.
      const cambiaRol = rolAsignado !== undefined && rolAsignado !== user.role;
      if (cambiaRol || user.passwordHash) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: null, mustChangePassword: false, ...(cambiaRol ? { role: rolAsignado } : {}) },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          fullName: nombre ?? email.split('@')[0],
          role: rolAsignado ?? Role.STUDENT,
          provider: AuthProvider.CODIGO,
        },
      });
    }

    return this.sesion(user);
  }

  /**
   * Cambia la contraseña de quien olvidó la suya. El código enviado al correo
   * demuestra que la persona es dueña del buzón, así que se abre la sesión de
   * una vez y se aplica el rol de ADMIN_EMAILS / DOCENTE_EMAILS si figura allí.
   */
  async restablecerContrasena(emailCrudo: string, codigo: string, password: string) {
    this.exigirContrasenaPermitida();
    const email = await this.codigo.verificarRestablecimiento(emailCrudo, codigo);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('No hay ninguna cuenta con ese correo.');

    const rolAsignado = this.microsoft.rolPorCorreo(email);
    const actualizado = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        ...(rolAsignado !== undefined && rolAsignado !== user.role ? { role: rolAsignado } : {}),
      },
    });
    return this.sesion(actualizado);
  }

  /**
   * Cambio de contraseña de la propia cuenta (también el obligatorio tras un
   * restablecimiento del docente). Cierra las demás sesiones y devuelve una
   * nueva para este navegador.
   */
  async cambiarContrasena(userId: string, actual: string, nueva: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    // 400 y no 401: un 401 haría que el navegador cerrara la sesión.
    if (!user.passwordHash || !(await bcrypt.compare(actual, user.passwordHash))) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }
    if (actual === nueva) {
      throw new BadRequestException('La contraseña nueva debe ser distinta de la actual.');
    }
    const actualizado = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(nueva, 10),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });
    return this.sesion(actualizado);
  }

  private sesion(user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    createdAt: Date;
    mustChangePassword?: boolean;
  }) {
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt,
        mustChangePassword: user.mustChangePassword ?? false,
      },
      token: this.signToken(user.id, user.email, user.role),
    };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true, mustChangePassword: true },
    });
  }

  private signToken(userId: string, email: string, role: Role): string {
    const payload: JwtPayload = { sub: userId, email, role };
    return this.jwt.sign(payload);
  }
}
