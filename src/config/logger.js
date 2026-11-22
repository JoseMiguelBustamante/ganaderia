const timers = new Map();

const write = (level, message) => {
    const line = `[${new Date().toISOString()}] ${level} ${message}`;
    if (level === 'ERROR') {
        console.error(line);
        return;
    }
    console.info(line);
};

export const logger = {
    info(message) {
        write('INFO', message);
    },
    warn(message) {
        write('WARN', message);
    },
    error(error) {
        const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
        write('ERROR', message);
    },
    startTimer(name) {
        timers.set(name, Date.now());
    },
    endTimer(name) {
        const started = timers.get(name);
        timers.delete(name);
        if (started == null) return;
        this.info(`${name} ${Date.now() - started}ms`);
    },
};
