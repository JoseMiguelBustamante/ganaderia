import 'dotenv/config';
import { app } from './src/app.js';
import { env } from './src/config/env.js';
import { logger } from './src/config/logger.js';

app.listen(env.PORT, () => {
    logger.info(`API listening on ${env.BASE_URL} (port ${env.PORT})`);
});
