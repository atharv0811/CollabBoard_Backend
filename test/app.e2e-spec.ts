import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('CollabBoard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const emailA = `e2e-a-${runId}@example.com`;
  const emailB = `e2e-b-${runId}@example.com`;
  const password = 'password123';

  let tokenA: string;
  let tokenB: string;

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await app.close();
  });

  it('/ (GET)', () => {
    return http().get('/').expect(200).expect('Hello World!');
  });

  describe('auth', () => {
    it('POST /auth/register creates a user without exposing passwordHash', async () => {
      const res = await http()
        .post('/auth/register')
        .send({ name: 'User A', email: emailA, password })
        .expect(201);

      expect(res.body).toMatchObject({ name: 'User A', email: emailA });
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body).not.toHaveProperty('password');
    });

    it('stores a bcrypt hash, never the raw password', async () => {
      const row = await prisma.user.findUnique({ where: { email: emailA } });

      expect(row?.passwordHash).toBeDefined();
      expect(row?.passwordHash).not.toBe(password);
      expect(row?.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('POST /auth/register rejects a duplicate email with 409', async () => {
      await http()
        .post('/auth/register')
        .send({ name: 'User A', email: emailA, password })
        .expect(409);
    });

    it('POST /auth/register rejects invalid input with 400', async () => {
      await http()
        .post('/auth/register')
        .send({ name: 'ab', email: 'not-an-email', password: 'short' })
        .expect(400);
    });

    it('POST /auth/login returns a token and a safe user', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email: emailA, password })
        .expect(201);

      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toMatchObject({ email: emailA });
      expect(res.body.user).not.toHaveProperty('passwordHash');
      tokenA = res.body.token;
    });

    it('POST /auth/login gives the same 401 for wrong password and unknown email', async () => {
      const wrongPassword = await http()
        .post('/auth/login')
        .send({ email: emailA, password: 'wrong-password' })
        .expect(401);
      const unknownEmail = await http()
        .post('/auth/login')
        .send({ email: `nobody-${runId}@example.com`, password })
        .expect(401);

      expect(wrongPassword.body.message).toBe('Invalid credentials');
      expect(unknownEmail.body.message).toBe('Invalid credentials');
    });

    it('GET /users/me requires a valid token', async () => {
      await http().get('/users/me').expect(401);
      await http()
        .get('/users/me')
        .set(auth(tokenA))
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({ email: emailA });
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('POST /users requires a token and also hashes the password', async () => {
      await http()
        .post('/users')
        .send({ name: 'User B', email: emailB, password })
        .expect(401);

      await http()
        .post('/users')
        .set(auth(tokenA))
        .send({ name: 'User B', email: emailB, password })
        .expect(201);

      const row = await prisma.user.findUnique({ where: { email: emailB } });
      expect(row?.passwordHash).not.toBe(password);

      const res = await http()
        .post('/auth/login')
        .send({ email: emailB, password })
        .expect(201);
      tokenB = res.body.token;
    });
  });

  describe('boards', () => {
    let boardId: string;
    const document = { shapes: [{ id: 1, type: 'rect' }] };

    it('rejects unauthenticated requests', async () => {
      await http().get('/boards').expect(401);
      await http().post('/boards').send({ name: 'x', document }).expect(401);
    });

    it('POST /boards creates a board with timestamp dates', async () => {
      const res = await http()
        .post('/boards')
        .set(auth(tokenA))
        .send({ name: '  My   Board ', document })
        .expect(201);

      expect(res.body).toMatchObject({ name: 'My Board', document });
      expect(typeof res.body.createdAt).toBe('number');
      expect(typeof res.body.updatedAt).toBe('number');
      boardId = res.body.id;
    });

    it('POST /boards rejects a duplicate name (case-insensitive) with 409', async () => {
      await http()
        .post('/boards')
        .set(auth(tokenA))
        .send({ name: 'my board', document })
        .expect(409);
    });

    it('POST /boards rejects invalid bodies with 400', async () => {
      await http()
        .post('/boards')
        .set(auth(tokenA))
        .send({ name: '', document })
        .expect(400);
      await http()
        .post('/boards')
        .set(auth(tokenA))
        .send({ name: 'a'.repeat(81), document })
        .expect(400);
      await http()
        .post('/boards')
        .set(auth(tokenA))
        .send({ name: 'No Document' })
        .expect(400);
    });

    it('GET /boards lists the owner boards with pagination', async () => {
      const res = await http()
        .get('/boards?page=1&limit=10')
        .set(auth(tokenA))
        .expect(200);

      expect(res.body.boards).toHaveLength(1);
      expect(res.body.boards[0]).toMatchObject({
        id: boardId,
        name: 'My Board',
      });
      expect(res.body.boards[0]).not.toHaveProperty('document');
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('GET /boards rejects invalid pagination with 400', async () => {
      await http().get('/boards?page=0').set(auth(tokenA)).expect(400);
      await http().get('/boards?limit=101').set(auth(tokenA)).expect(400);
    });

    it('GET /boards/:id returns the board', async () => {
      const res = await http()
        .get(`/boards/${boardId}`)
        .set(auth(tokenA))
        .expect(200);

      expect(res.body).toMatchObject({ id: boardId, document });
    });

    it('GET /boards/:id rejects a non-UUID id with 400', async () => {
      await http().get('/boards/not-a-uuid').set(auth(tokenA)).expect(400);
    });

    it('hides boards from other users (404 for get, rename, update and delete)', async () => {
      await http().get(`/boards/${boardId}`).set(auth(tokenB)).expect(404);
      await http()
        .patch(`/boards/${boardId}/name`)
        .set(auth(tokenB))
        .send({ name: 'Hijacked' })
        .expect(404);
      await http()
        .patch(`/boards/${boardId}/document`)
        .set(auth(tokenB))
        .send({ document: { hijacked: true } })
        .expect(404);
      await http().delete(`/boards/${boardId}`).set(auth(tokenB)).expect(404);

      const list = await http().get('/boards').set(auth(tokenB)).expect(200);
      expect(list.body.boards).toHaveLength(0);
    });

    it('PATCH /boards/:id/name renames the board', async () => {
      const res = await http()
        .patch(`/boards/${boardId}/name`)
        .set(auth(tokenA))
        .send({ name: 'Renamed' })
        .expect(200);

      expect(res.body).toMatchObject({ id: boardId, name: 'Renamed' });
    });

    it('PATCH /boards/:id/name rejects a name used by another board with 409', async () => {
      await http()
        .post('/boards')
        .set(auth(tokenA))
        .send({ name: 'Second', document })
        .expect(201);

      await http()
        .patch(`/boards/${boardId}/name`)
        .set(auth(tokenA))
        .send({ name: 'second' })
        .expect(409);
    });

    it('PATCH /boards/:id/document updates the document', async () => {
      const next = { shapes: [] };
      const res = await http()
        .patch(`/boards/${boardId}/document`)
        .set(auth(tokenA))
        .send({ document: next })
        .expect(200);

      expect(res.body).toMatchObject({ id: boardId, document: next });
    });

    it('DELETE /boards/:id deletes the board', async () => {
      await http()
        .delete(`/boards/${boardId}`)
        .set(auth(tokenA))
        .expect(200)
        .expect({ message: 'Board deleted successfully' });

      await http().get(`/boards/${boardId}`).set(auth(tokenA)).expect(404);
      await http().delete(`/boards/${boardId}`).set(auth(tokenA)).expect(404);
    });
  });
});
