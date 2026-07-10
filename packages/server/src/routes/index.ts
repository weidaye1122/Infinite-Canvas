import { Router } from 'express';
import authRoutes from './authRoutes';
import boardRoutes from './boardRoutes';
import shareRoutes from './shareRoutes';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use('/auth', authRoutes);
router.use('/boards', requireAuth, boardRoutes);
router.use('/share', shareRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
