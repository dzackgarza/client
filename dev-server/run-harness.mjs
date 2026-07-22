// Minimal harness runner: serves the built forked client (3001) + test documents (3006)
// with the client pointed at the local h backend, so annotations render in a real sidebar.
import { serveDev } from './serve-dev.js';
import { servePackage } from './serve-package.js';

servePackage(3011);
serveDev(3012, {
  clientUrl: '//{current_host}:3011/hypothesis',
  // NB: oauthClientId is NOT a host-page config key (hostPageConfig allowlist filters it
  // out); it is a sidebar-app setting, set in dev-server/static/fork-app.html instead.
  clientConfig: {},
});
