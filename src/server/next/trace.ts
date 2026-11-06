import 'server-only';

let seq = 0;

/**
 * Temporary diagnostics for the admin timeouts: logs when a step starts and how long it took,
 * so a step that never finishes shows up in the runtime logs as a start without a matching end.
 */
export async function traced<T>(label: string, work: () => Promise<T>): Promise<T> {
  const id = ++seq;
  const started = Date.now();
  console.info(`[trace] #${id} ${label} start`);
  try {
    const result = await work();
    console.info(`[trace] #${id} ${label} done ${Date.now() - started}ms`);
    return result;
  } catch (err) {
    console.info(`[trace] #${id} ${label} failed ${Date.now() - started}ms ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}
