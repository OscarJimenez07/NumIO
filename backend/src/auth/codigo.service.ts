import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CorreoService } from './correo.service';
import { MicrosoftService } from './microsoft.service';

const VIGENCIA_MS = 10 * 60 * 1000;
const MAX_INTENTOS = 5;
const ESPERA_ENTRE_ENVIOS_MS = 60 * 1000;
const MAX_ENVIOS_POR_HORA = 5;
// Un salón entero sale a internet por la misma IP de la universidad: el
// límite por IP tiene que dejar pasar a un grupo completo pidiendo a la vez.
const MAX_SOLICITUDES_POR_IP = 120;
const VENTANA_IP_MS = 10 * 60 * 1000;

/** Para qué sirve el código: entrar sin contraseña o cambiar la contraseña. */
export type PropositoCodigo = 'INGRESO' | 'CONTRASENA';

export type ResultadoVerificacion =
  | { verificado: true; email: string; nombre?: string }
  | { verificado: false; requiereNombre: true };

/**
 * Ingreso sin contraseña con un código enviado al correo institucional.
 *
 * Demuestra lo mismo que el ingreso con Microsoft: que la persona controla un
 * buzón del dominio de la universidad. El código se guarda solo como HMAC,
 * caduca a los 10 minutos, sirve una vez y admite pocos intentos.
 */
@Injectable()
export class CodigoService {
  private readonly solicitudesPorIp = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
    private readonly microsoft: MicrosoftService,
    private readonly config: ConfigService,
  ) {}

  /** Sin lista de dominios cualquiera podría crearse una cuenta: no se ofrece. */
  get habilitado(): boolean {
    return this.correo.habilitado && this.microsoft.dominiosPermitidos.length > 0;
  }

  /** Para restablecer la contraseña basta con poder enviar correos. */
  get restablecimientoHabilitado(): boolean {
    return this.correo.habilitado;
  }

  private exigirHabilitado() {
    if (!this.habilitado) {
      throw new BadRequestException('El ingreso con código no está disponible.');
    }
  }

  private normalizar(email: string): string {
    return email.trim().toLowerCase();
  }

  private exigirDominio(email: string) {
    const dominio = email.split('@')[1] ?? '';
    const permitidos = this.microsoft.dominiosPermitidos;
    if (!permitidos.some((d) => dominio === d || dominio.endsWith('.' + d))) {
      throw new BadRequestException(
        `Usa tu correo institucional (${permitidos.map((d) => '@' + d).join(' o ')}).`,
      );
    }
  }

  private hmac(email: string, codigo: string): string {
    const clave = this.config.get<string>('JWT_SECRET') ?? 'change-me';
    return createHmac('sha256', clave).update(`${email}:${codigo}`).digest('hex');
  }

  private limitarPorIp(ip: string) {
    const ahora = Date.now();
    const recientes = (this.solicitudesPorIp.get(ip) ?? []).filter((t) => ahora - t < VENTANA_IP_MS);
    if (recientes.length >= MAX_SOLICITUDES_POR_IP) {
      throw new HttpException(
        'Demasiadas solicitudes desde esta red. Espera unos minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recientes.push(ahora);
    this.solicitudesPorIp.set(ip, recientes);
  }

  async solicitar(emailCrudo: string, ip: string): Promise<void> {
    this.exigirHabilitado();
    const email = this.normalizar(emailCrudo);
    this.exigirDominio(email);
    this.limitarPorIp(ip);
    const codigo = await this.generar(email, 'INGRESO');
    await this.correo.enviarCodigo(email, codigo);
  }

  /**
   * Envía el código para restablecer la contraseña. Solo exige que el correo
   * tenga cuenta; no el dominio, porque la cuenta ya pasó ese filtro al crearse.
   */
  async solicitarRestablecimiento(emailCrudo: string, ip: string): Promise<void> {
    if (!this.restablecimientoHabilitado) {
      throw new BadRequestException(
        'El restablecimiento de contraseña no está disponible. Consulta al docente.',
      );
    }
    const email = this.normalizar(emailCrudo);
    this.limitarPorIp(ip);
    const existe = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!existe) {
      throw new BadRequestException('No hay ninguna cuenta con ese correo. Revisa que esté bien escrito.');
    }
    const codigo = await this.generar(email, 'CONTRASENA');
    await this.correo.enviarCodigoContrasena(email, codigo);
  }

  /** Crea un código nuevo (anulando los anteriores del mismo propósito). */
  private async generar(email: string, proposito: PropositoCodigo): Promise<string> {

    const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
    const recientes = await this.prisma.loginCode.findMany({
      where: { email, purpose: proposito, createdAt: { gte: haceUnaHora } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recientes[0] && Date.now() - recientes[0].createdAt.getTime() < ESPERA_ENTRE_ENVIOS_MS) {
      throw new HttpException(
        'Ya te enviamos un código hace menos de un minuto. Revisa tu correo (también la carpeta de spam).',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (recientes.length >= MAX_ENVIOS_POR_HORA) {
      throw new HttpException(
        'Pediste demasiados códigos. Espera una hora e inténtalo de nuevo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const codigo = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const ahora = new Date();
    // Solo vale el último código pedido.
    await this.prisma.loginCode.updateMany({
      where: { email, purpose: proposito, usedAt: null, expiresAt: { gt: ahora } },
      data: { expiresAt: ahora },
    });
    await this.prisma.loginCode.create({
      data: {
        email,
        purpose: proposito,
        codeHash: this.hmac(email, codigo),
        expiresAt: new Date(ahora.getTime() + VIGENCIA_MS),
      },
    });
    // Limpieza oportunista: los códigos de hace más de un día ya no sirven.
    await this.prisma.loginCode.deleteMany({
      where: { createdAt: { lt: new Date(ahora.getTime() - 24 * 60 * 60 * 1000) } },
    });
    return codigo;
  }

  /**
   * Comprueba el código. Si es correcto pero la cuenta aún no existe y no llegó
   * el nombre, no lo consume: el navegador pide el nombre y lo reenvía.
   */
  async verificar(emailCrudo: string, codigo: string, nombre?: string): Promise<ResultadoVerificacion> {
    this.exigirHabilitado();
    const email = this.normalizar(emailCrudo);
    const registro = await this.comprobar(email, codigo, 'INGRESO');

    const nombreLimpio = nombre?.trim();
    const existe = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!existe && !nombreLimpio) {
      return { verificado: false, requiereNombre: true };
    }

    await this.consumir(registro.id);
    return { verificado: true, email, nombre: nombreLimpio };
  }

  /** Comprueba y gasta un código de restablecimiento; devuelve el correo normalizado. */
  async verificarRestablecimiento(emailCrudo: string, codigo: string): Promise<string> {
    const email = this.normalizar(emailCrudo);
    const registro = await this.comprobar(email, codigo, 'CONTRASENA');
    await this.consumir(registro.id);
    return email;
  }

  /** Valida el código vigente sin gastarlo; cada fallo cuenta como intento. */
  private async comprobar(email: string, codigo: string, proposito: PropositoCodigo) {
    const registro = await this.prisma.loginCode.findFirst({
      where: { email, purpose: proposito, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!registro) {
      throw new UnauthorizedException('El código venció o no existe. Pide uno nuevo.');
    }
    if (registro.attempts >= MAX_INTENTOS) {
      throw new UnauthorizedException('Demasiados intentos con este código. Pide uno nuevo.');
    }

    const esperado = Buffer.from(registro.codeHash, 'hex');
    const recibido = Buffer.from(this.hmac(email, codigo.trim()), 'hex');
    if (!timingSafeEqual(esperado, recibido)) {
      await this.prisma.loginCode.update({
        where: { id: registro.id },
        data: { attempts: { increment: 1 } },
      });
      const quedan = MAX_INTENTOS - registro.attempts - 1;
      throw new UnauthorizedException(
        quedan > 0
          ? `Código incorrecto. Te quedan ${quedan} intento${quedan === 1 ? '' : 's'}.`
          : 'Código incorrecto. Pide uno nuevo.',
      );
    }
    return registro;
  }

  /** Se marca como usado solo si nadie se adelantó con el mismo código. */
  private async consumir(id: string) {
    const { count } = await this.prisma.loginCode.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count !== 1) {
      throw new UnauthorizedException('Este código ya se usó. Pide uno nuevo.');
    }
  }
}
