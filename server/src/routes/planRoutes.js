import { Router } from 'express';
import { createPlan, deletePlan, exportProjection, listPlans } from '../controllers/planController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', listPlans);
router.post('/', createPlan);
router.post('/export', exportProjection);
router.delete('/:id', deletePlan);
export default router;
