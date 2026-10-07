import { Body, Controller, Get, HttpCode, Post, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MicrosoftLoginDto } from './dto/microsoft-login.dto';
import { MicrosoftService } from './microsoft.service';
import { CodigoService } from './codigo.service';
import { CambiarContrasenaDto, RestablecerContrasenaDto, SolicitarCodigoDto, VerificarCodigoDto } from './dto/codigo.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly microsoft: MicrosoftService,
    private readonly codigo: CodigoService,
  ) {}

  /** Público: le dice al navegador qué formas de ingreso ofrecer. */
  @Get('config')
  config() {
    return {
      microsoft: this.microsoft.configPublica(),
      codigo: {
        enabled: this.codigo.habilitado,
        allowedDomains: this.microsoft.dominiosPermitidos,
      },
      contrasena: this.auth.contrasenaPermitida,
      restablecerContrasena: this.auth.contrasenaPermitida && this.codigo.restablecimientoHabilitado,
    };
  }

  /** Envía un código de un solo uso al correo institucional. */
  @Post('codigo/solicitar')
  @HttpCode(200)
  async solicitarCodigo(@Body() dto: SolicitarCodigoDto, @Req() req: any) {
    await this.codigo.solicitar(dto.email, ipCliente(req));
    return { ok: true };
  }

  /** Canjea el código por la sesión, o pide el nombre si la cuenta es nueva. */
  @Post('codigo/verificar')
  @HttpCode(200)
  async verificarCodigo(@Body() dto: VerificarCodigoDto) {
    const r = await this.codigo.verificar(dto.email, dto.codigo, dto.nombre);
    if (!r.verificado) return { requiereNombre: true };
    return this.auth.ingresarConCorreoVerificado(r.email, r.nombre);
  }

  /** Envía al correo un código para cambiar la contraseña olvidada. */
  @Post('contrasena/solicitar')
  @HttpCode(200)
  async solicitarRestablecimiento(@Body() dto: SolicitarCodigoDto, @Req() req: any) {
    this.auth.exigirContrasenaPermitida();
    await this.codigo.solicitarRestablecimiento(dto.email, ipCliente(req));
    return { ok: true };
  }

  /** Canjea el código por la nueva contraseña y abre la sesión. */
  @Post('contrasena/restablecer')
  @HttpCode(200)
  restablecerContrasena(@Body() dto: RestablecerContrasenaDto) {
    return this.auth.restablecerContrasena(dto.email, dto.codigo, dto.password);
  }

  /** Cambia la contraseña de quien ya inició sesión. */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('contrasena/cambiar')
  @HttpCode(200)
  cambiarContrasena(@Body() dto: CambiarContrasenaDto, @Req() req: any) {
    return this.auth.cambiarContrasena(req.user.userId, dto.actual, dto.nueva);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Canjea el id_token de Entra ID por la sesión de la plataforma. */
  @Post('microsoft')
  microsoftLogin(@Body() dto: MicrosoftLoginDto) {
    return this.auth.ingresarConMicrosoft(dto.idToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.userId);
  }
}

/** Detrás de Caddy y nginx, la IP real es la primera de X-Forwarded-For. */
function ipCliente(req: any): string {
  const reenviada = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return reenviada || req.ip || 'desconocida';
}
