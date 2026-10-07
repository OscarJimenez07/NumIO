import { Injectable, Logger, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { Role } from '@prisma/client';

/**
 * Verificación de la identidad institucional emitida por Microsoft Entra ID.
 *
 * El navegador obtiene el id_token con la biblioteca de Microsoft y lo envía
 * aquí; este servicio comprueba que ese token es auténtico antes de conceder
 * acceso. La comprobación no se salta ninguno de estos pasos:
 *
 *   1. la firma corresponde a una clave pública vigente de Microsoft,
 *   2. lo emitió el inquilino (tenant) de la universidad, no otro cualquiera,
 *   3. está dirigido a esta aplicación y no a una distinta,
 *   4. no ha caducado,
 *   5. el correo pertenece a un dominio autorizado.
 *
 * Sin el paso 3 cualquiera podría presentar un token legítimo obtenido para
 * otra aplicación; sin el 2, una cuenta personal de Microsoft entraría como
 * si fuera institucional.
 */

export interface IdentidadMicrosoft {
  oid: string;
  email: string;
  nombre: string;
}

@Injectable()
export class MicrosoftService {
  private readonly log = new Logger(MicrosoftService.name);
  private jwks?: JwksClient;

  constructor(private readonly config: ConfigService) {}

  get tenantId(): string | undefined {
    return this.config.get<string>('MS_TENANT_ID')?.trim() || undefined;
  }

  get clientId(): string | undefined {
    return this.config.get<string>('MS_CLIENT_ID')?.trim() || undefined;
  }

  /**
   * Dominios de correo admitidos, tanto con Microsoft como con código. Vacío =
   * cualquiera del inquilino, y el ingreso con código queda desactivado.
   */
  get dominiosPermitidos(): string[] {
    return (this.config.get<string>('MS_ALLOWED_DOMAINS') ?? '')
      .split(',')
      .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);
  }

  /** La plataforma sigue funcionando con correo y contraseña si esto es falso. */
  get habilitado(): boolean {
    return Boolean(this.tenantId && this.clientId);
  }

  /**
   * Rol que corresponde a un correo según ADMIN_EMAILS y DOCENTE_EMAILS
   * (listas separadas por comas). Undefined si el correo no figura en ninguna.
   */
  rolPorCorreo(correo: string): Role | undefined {
    const lista = (clave: string) =>
      (this.config.get<string>(clave) ?? '')
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);
    const c = correo.trim().toLowerCase();
    if (lista('ADMIN_EMAILS').includes(c)) return Role.ADMIN;
    if (lista('DOCENTE_EMAILS').includes(c)) return Role.TEACHER;
    return undefined;
  }

  /** Lo que el frontend necesita para dibujar (o no) el botón institucional. */
  configPublica() {
    return {
      enabled: this.habilitado,
      clientId: this.clientId ?? null,
      tenantId: this.tenantId ?? null,
      allowedDomains: this.dominiosPermitidos,
    };
  }

  private cliente(): JwksClient {
    if (!this.jwks) {
      this.jwks = new JwksClient({
        jwksUri: `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`,
        cache: true,
        cacheMaxAge: 24 * 60 * 60 * 1000,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
    }
    return this.jwks;
  }

  async verificar(idToken: string): Promise<IdentidadMicrosoft> {
    if (!this.habilitado) {
      throw new ServiceUnavailableException(
        'El ingreso con la cuenta institucional no está configurado en este servidor.',
      );
    }

    const cabecera = jwt.decode(idToken, { complete: true })?.header;
    if (!cabecera?.kid) throw new UnauthorizedException('Token de Microsoft mal formado.');

    let clavePublica: string;
    try {
      clavePublica = (await this.cliente().getSigningKey(cabecera.kid)).getPublicKey();
    } catch (e) {
      this.log.error(`No se pudo obtener la clave de firma de Microsoft: ${e}`);
      throw new ServiceUnavailableException(
        'No se pudo contactar con Microsoft para verificar la identidad. Intenta de nuevo.',
      );
    }

    let datos: jwt.JwtPayload;
    try {
      datos = jwt.verify(idToken, clavePublica, {
        algorithms: ['RS256'],
        audience: this.clientId,
        issuer: [
          `https://login.microsoftonline.com/${this.tenantId}/v2.0`,
          `https://sts.windows.net/${this.tenantId}/`,
        ],
        clockTolerance: 60,
      }) as jwt.JwtPayload;
    } catch (e: any) {
      this.log.warn(`Token institucional rechazado: ${e?.message}`);
      throw new UnauthorizedException('La identidad de Microsoft no pudo verificarse.');
    }

    // El inquilino se comprueba de nuevo sobre el contenido: el emisor ya lo
    // acota, pero este segundo control deja la intención explícita.
    if (datos.tid && datos.tid !== this.tenantId) {
      throw new UnauthorizedException('La cuenta no pertenece a la organización autorizada.');
    }

    const correo = String(
      datos.preferred_username ?? datos.email ?? datos.upn ?? '',
    ).toLowerCase().trim();
    if (!correo || !correo.includes('@')) {
      throw new UnauthorizedException('Microsoft no entregó un correo para esta cuenta.');
    }

    const permitidos = this.dominiosPermitidos;
    if (permitidos.length) {
      const dominio = correo.split('@')[1];
      const vale = permitidos.some((d) => dominio === d || dominio.endsWith('.' + d));
      if (!vale) {
        throw new UnauthorizedException(
          `Debes ingresar con tu correo institucional (${permitidos.map((d) => '@' + d).join(' o ')}).`,
        );
      }
    }

    const oid = String(datos.oid ?? datos.sub ?? '');
    if (!oid) throw new UnauthorizedException('Microsoft no entregó un identificador de cuenta.');

    return {
      oid,
      email: correo,
      nombre: String(datos.name ?? correo.split('@')[0]),
    };
  }
}
