import { start, stop } from './pg-cluster.js';

export default async function () {
    await start();
    return async () => {
        await stop();
    };
}
