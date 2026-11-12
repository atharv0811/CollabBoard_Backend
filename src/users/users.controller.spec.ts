import { UsersController } from './users.controller.js';
import { AuthService } from '../auth/auth.service.js';

describe('UsersController', () => {
  let controller: UsersController;
  let authService: { registerUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { registerUser: vi.fn() };
    controller = new UsersController(authService as unknown as AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /users goes through AuthService so the password is hashed', async () => {
    const dto = { name: 'John', email: 'john@example.com', password: 'password123' };
    const user = { id: 1, name: 'John', email: 'john@example.com' };
    authService.registerUser.mockResolvedValue(user);

    await expect(controller.createUser(dto)).resolves.toBe(user);
    expect(authService.registerUser).toHaveBeenCalledWith(dto);
  });
});
