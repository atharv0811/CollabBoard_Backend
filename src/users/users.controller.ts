import { Body, Controller, Get, Inject, Post, Req, UseGuards, forwardRef } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard.js';
import { UsersService } from './users.service.js';
import { type AuthenticatedRequest } from '../security/interfaces/authenticated-request.interface.js';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) { }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.registerUser(createUserDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.findById(req.user?.sub)
  }
}
