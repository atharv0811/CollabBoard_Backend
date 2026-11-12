import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { UsersService } from '../users/users.service.js';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private readonly usersService: UsersService) { }

    async registerUser(data: CreateUserDto) {
        const isUserExist = await this.usersService.findByEmail(data.email);

        if (isUserExist) {
            throw new ConflictException("User already exists");
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        return this.usersService.createUser({
            name: data.name,
            email: data.email,
            passwordHash
        });
    }
}
