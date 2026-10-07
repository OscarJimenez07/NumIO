import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CambiarRolDto, RestablecerContrasenaUsuarioDto } from './dto/cambiar-rol.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id/rol')
  cambiarRol(@Param('id') id: string, @Body() dto: CambiarRolDto, @Req() req: any) {
    return this.users.cambiarRol(req.user, id, dto.role);
  }

  @Post(':id/restablecer-contrasena')
  @HttpCode(200)
  restablecerContrasena(
    @Param('id') id: string,
    @Body() dto: RestablecerContrasenaUsuarioDto,
    @Req() req: any,
  ) {
    return this.users.restablecerContrasena(req.user, id, dto.password);
  }
}
