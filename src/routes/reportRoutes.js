import { Router } from 'ultimate-express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateParams, validateQuery } from '../middlewares/validateDto.js';
import { reportAnimalIdParamsDto, reportsSummaryQueryDto } from '../dto/report.dto.js';
import {
    getAnimalCostsController, getStageCostsController, getReportsSummaryController,
    exportPurchasesCsvController, exportConsumptionCsvController,
} from '../controllers/reportController.js';

const router = Router();

router.get('/animals/:id/costs', authenticate, validateParams(reportAnimalIdParamsDto), getAnimalCostsController);
router.get('/stage-costs', authenticate, getStageCostsController);
router.get('/summary', authenticate, validateQuery(reportsSummaryQueryDto), getReportsSummaryController);

// CSV exports (operar con confianza, T2): same range contract as the summary.
router.get('/export/purchases.csv',
    authenticate, validateQuery(reportsSummaryQueryDto), exportPurchasesCsvController);
router.get('/export/consumption.csv',
    authenticate, validateQuery(reportsSummaryQueryDto), exportConsumptionCsvController);

export default router;
