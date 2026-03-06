import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@Controller('auth/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly authService: AuthService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination and filters' })
  async listUsers(@Query() query: AdminUserQueryDto) {
    return this.authService.adminListUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a single user by ID' })
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.authService.adminGetUser(id);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (any role)' })
  async createUser(@Body() dto: AdminCreateUserDto) {
    return this.authService.adminCreateUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user role, status, email, or phone' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.authService.adminUpdateUser(id, dto);
  }

  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a user password (returns temporary password)' })
  async resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.authService.adminResetPassword(id);
  }
}
