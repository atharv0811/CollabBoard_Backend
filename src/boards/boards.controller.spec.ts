import { BoardsController } from './boards.controller.js';
import { BoardsService } from './boards.service.js';
import { type AuthenticatedRequest } from '../security/interfaces/authenticated-request.interface.js';

describe('BoardsController', () => {
  let controller: BoardsController;
  let service: {
    createBoard: ReturnType<typeof vi.fn>;
    listBoards: ReturnType<typeof vi.fn>;
    getBoard: ReturnType<typeof vi.fn>;
    deleteBoard: ReturnType<typeof vi.fn>;
    renameBoard: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
  };

  const userId = 'user-1';
  const boardId = '11111111-1111-4111-8111-111111111111';
  const req = { user: { sub: userId } } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    service = {
      createBoard: vi.fn(),
      listBoards: vi.fn(),
      getBoard: vi.fn(),
      deleteBoard: vi.fn(),
      renameBoard: vi.fn(),
      updateDocument: vi.fn(),
    };
    controller = new BoardsController(service as unknown as BoardsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createBoard passes the user id and dto to the service', async () => {
    const dto = { name: 'Board', document: { shapes: [] } };
    const board = { id: boardId };
    service.createBoard.mockResolvedValue(board);

    await expect(controller.createBoard(req, dto)).resolves.toBe(board);
    expect(service.createBoard).toHaveBeenCalledWith(userId, dto);
  });

  it('listBoards passes the user id and pagination to the service', async () => {
    const query = { page: 1, limit: 10 };
    const page = { boards: [], pagination: {} };
    service.listBoards.mockResolvedValue(page);

    await expect(controller.listBoards(req, query)).resolves.toBe(page);
    expect(service.listBoards).toHaveBeenCalledWith(userId, query);
  });

  it('getBoard passes the user id and board id to the service', async () => {
    const board = { id: boardId };
    service.getBoard.mockResolvedValue(board);

    await expect(controller.getBoard(req, boardId)).resolves.toBe(board);
    expect(service.getBoard).toHaveBeenCalledWith(userId, boardId);
  });

  it('deleteBoard passes the user id and board id to the service', async () => {
    const result = { message: 'Board deleted successfully' };
    service.deleteBoard.mockResolvedValue(result);

    await expect(controller.deleteBoard(req, boardId)).resolves.toBe(result);
    expect(service.deleteBoard).toHaveBeenCalledWith(userId, boardId);
  });

  it('renameBoard passes only the new name to the service', async () => {
    const board = { id: boardId, name: 'Renamed' };
    service.renameBoard.mockResolvedValue(board);

    await expect(
      controller.renameBoard(req, boardId, { name: 'Renamed' }),
    ).resolves.toBe(board);
    expect(service.renameBoard).toHaveBeenCalledWith(
      userId,
      boardId,
      'Renamed',
    );
  });

  it('updateDocument passes only the document to the service', async () => {
    const document = { shapes: [{ id: 1 }] };
    const board = { id: boardId, document };
    service.updateDocument.mockResolvedValue(board);

    await expect(
      controller.updateDocument(req, boardId, { document }),
    ).resolves.toBe(board);
    expect(service.updateDocument).toHaveBeenCalledWith(
      userId,
      boardId,
      document,
    );
  });
});
