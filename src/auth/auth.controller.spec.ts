import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    registerUser: ReturnType<typeof vi.fn>;
    loginUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authService = { registerUser: vi.fn(), loginUser: vi.fn() };
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /auth/register delegates to AuthService.registerUser', async () => {
    const dto = {
      name: 'John',
      email: 'john@example.com',
      password: 'password123',
    };
    const user = { id: 1, name: 'John', email: 'john@example.com' };
    authService.registerUser.mockResolvedValue(user);

    await expect(controller.registerUser(dto)).resolves.toBe(user);
    expect(authService.registerUser).toHaveBeenCalledWith(dto);
  });

  it('POST /auth/login delegates to AuthService.loginUser', async () => {
    const dto = { email: 'john@example.com', password: 'password123' };
    const response = {
      token: 'jwt',
      user: { id: 1, email: 'john@example.com' },
    };
    authService.loginUser.mockResolvedValue(response);

    await expect(controller.loginUser(dto)).resolves.toBe(response);
    expect(authService.loginUser).toHaveBeenCalledWith(dto);
  });
});
