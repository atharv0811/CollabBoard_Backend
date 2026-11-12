import { Body, Controller, Inject, Post, forwardRef } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Controller('users')
export class UsersController {
    constructor(
        @Inject(forwardRef(() => AuthService))
        private readonly authService: AuthService
    ) { }

    @Post()
    createUser(@Body() createUserDto: CreateUserDto) {
        // Hashing lives in AuthService, so POST /users never stores a raw password.
        return this.authService.registerUser(createUserDto);
    }
}
