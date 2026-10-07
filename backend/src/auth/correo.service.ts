import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

/**
 * Envío de los códigos de ingreso y de restablecimiento de contraseña.
 *
 * Usa SMTP para no atarse a un proveedor: sirve igual una cuenta de Gmail con
 * contraseña de aplicación, Brevo o cualquier otro. En desarrollo, con
 * CODIGO_EN_CONSOLA=true y sin SMTP, el código se escribe en el registro del
 * contenedor en lugar de enviarse.
 */
@Injectable()
export class CorreoService {
  private readonly log = new Logger(CorreoService.name);
  private transporte?: Transporter;

  constructor(private readonly config: ConfigService) {}

  private valor(clave: string): string | undefined {
    return this.config.get<string>(clave)?.trim() || undefined;
  }

  get smtpConfigurado(): boolean {
    return Boolean(this.valor('SMTP_HOST') && this.valor('SMTP_USER') && this.valor('SMTP_PASS'));
  }

  get enConsola(): boolean {
    return !this.smtpConfigurado && this.valor('CODIGO_EN_CONSOLA') === 'true';
  }

  get habilitado(): boolean {
    return this.smtpConfigurado || this.enConsola;
  }

  private obtenerTransporte(): Transporter {
    if (!this.transporte) {
      const puerto = Number(this.valor('SMTP_PORT') ?? 587);
      this.transporte = createTransport({
        host: this.valor('SMTP_HOST'),
        port: puerto,
        // 465 es TLS directo; 587 arranca en claro y exige STARTTLS.
        secure: puerto === 465,
        requireTLS: puerto !== 465,
        auth: { user: this.valor('SMTP_USER'), pass: this.valor('SMTP_PASS') },
      });
    }
    return this.transporte;
  }

  async enviarCodigo(destino: string, codigo: string): Promise<void> {
    await this.enviar(destino, codigo, {
      asunto: `${codigo} es tu código de ingreso a NumIO`,
      frase: 'Tu código para ingresar a NumIO es:',
      fraseHtml: 'Tu código para ingresar a <strong>NumIO</strong> es:',
      aviso: 'Si no lo pediste, ignora este correo: nadie puede entrar sin él.',
    });
  }

  async enviarCodigoContrasena(destino: string, codigo: string): Promise<void> {
    await this.enviar(destino, codigo, {
      asunto: `${codigo} es tu código para restablecer la contraseña de NumIO`,
      frase: 'Tu código para restablecer la contraseña de NumIO es:',
      fraseHtml: 'Tu código para restablecer la contraseña de <strong>NumIO</strong> es:',
      aviso: 'Si no lo pediste, ignora este correo: tu contraseña no cambia sin él.',
    });
  }

  private async enviar(
    destino: string,
    codigo: string,
    t: { asunto: string; frase: string; fraseHtml: string; aviso: string },
  ): Promise<void> {
    if (this.enConsola) {
      this.log.warn(`[CODIGO_EN_CONSOLA] Código para ${destino}: ${codigo}`);
      return;
    }

    const remitente = this.valor('CORREO_REMITENTE') ?? this.valor('SMTP_USER');
    try {
      await this.obtenerTransporte().sendMail({
        from: `NumIO <${remitente}>`,
        to: destino,
        subject: t.asunto,
        text:
          `${t.frase} ${codigo}\n\n` +
          'Vence en 10 minutos y solo sirve una vez.\n' +
          `${t.aviso}\n`,
        html:
          '<div style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b">' +
          `<p>${t.fraseHtml}</p>` +
          `<p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:16px 0">${codigo}</p>` +
          '<p>Vence en 10 minutos y solo sirve una vez.</p>' +
          `<p style="color:#64748b;font-size:13px">${t.aviso}</p>` +
          '</div>',
      });
    } catch (e) {
      this.log.error(`No se pudo enviar el código a ${destino}: ${e}`);
      throw new ServiceUnavailableException(
        'No se pudo enviar el correo en este momento. Intenta de nuevo en unos minutos.',
      );
    }
  }
}
