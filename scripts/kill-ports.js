// Auto-kill any processes on ports 3000 and 8080 before starting dev servers
const { execSync } = require('child_process');

const ports = [3000, 3001, 8080];

for (const port of ports) {
  try {
    if (process.platform === 'win32') {
      // Windows: find PID via netstat and kill it
      const result = execSync(
        `netstat -ano | findstr :${port}`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const lines = result.split('\n').filter(Boolean);
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && pid !== '0') pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`[predev] Killed process ${pid} on port ${port}`);
        } catch (_) {}
      }
    } else {
      // macOS/Linux
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch (_) {
    // Port was free — nothing to kill
  }
}

console.log('[predev] Ports 3000 and 8080 are free. Starting servers...\n');
