import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users - 取得所有使用者
router.get('/', authenticate, requireRole('ADMIN'), async (_req, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

// POST /api/users - 新增使用者
router.post('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400).json({ message: '請填寫所有必要欄位' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: '此電子郵件已被使用' });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  res.status(201).json(user);
});

// PUT /api/users/:id - 更新使用者
router.put('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, role, isActive, password } = req.body;

  // 不能停用自己
  if (req.params.id === req.userId && isActive === false) {
    res.status(400).json({ message: '不能停用自己的帳號' });
    return;
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  res.json(user);
});

// DELETE /api/users/:id - 停用使用者（軟刪除）
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.params.id === req.userId) {
    res.status(400).json({ message: '不能刪除自己的帳號' });
    return;
  }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ message: '使用者已停用' });
});

export default router;
