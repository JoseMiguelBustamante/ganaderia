// Real HTTP server for integration tests. ultimate-express does not drive
// supertest's synthetic http.Handler, so tests start app.listen on an ephemeral
// port and request it over TCP — closer to the production path anyway.
import { app } from '../../../src/app.js';

export function startServer() {
    return new Promise((resolve) => {
        // ultimate-express: listen(port, host, callback) fires the callback with
        // no argument; the bound port lives on app.address().port, and app is
        // both the request handler and the "server" (with close()).
        app.listen(0, '127.0.0.1', () => {
            resolve({ server: app, baseUrl: `http://127.0.0.1:${app.address().port}` });
        });
    });
}

export function stopServer(server) {
    return new Promise((resolve) => server.close(resolve));
}
