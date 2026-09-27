// Stop the E2E web server (:3100) and its Postgres cluster after a manual run.
import { execSync } from 'node:child_process';
import { stopStaleCluster } from './lib/embedded-pg';

function killPort(port: number) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' });
      const pids = new Set(
        out
          .split('\n')
          .filter((l) => l.includes(`:${port} `) && l.includes('LISTENING'))
          .map((l) => l.trim().split(/\s+/).pop()),
      );
      for (const pid of pids) if (pid && pid !== '0') execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, { stdio: 'ignore', shell: '/bin/sh' });
    }
  } catch {
    // Nothing listening.
  }
}

killPort(3100);
stopStaleCluster('.data/pg-e2e');
console.log('E2E server stopped.');
