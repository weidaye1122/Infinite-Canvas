import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

router.get('/status', authController.status);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

export default router;
