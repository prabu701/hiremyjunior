// Router for the local edge-runtime (adapted from supabase/supabase docker/volumes/functions/main).
// JWT checks are per-function: vendor webhooks and the mock identity page carry no user token.

Deno.serve(async (req: Request) => {
  const serviceName = new URL(req.url).pathname.split('/')[1];
  if (!serviceName || serviceName.startsWith('_') || serviceName === 'main') {
    return Response.json({ message: 'function not found' }, { status: 404 });
  }

  const envVars = Object.entries(Deno.env.toObject());
  try {
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath: `/home/deno/functions/${serviceName}`,
      memoryLimitMb: 150,
      workerTimeoutMs: 60_000,
      noModuleCache: false,
      importMapPath: '/home/deno/functions/deno.jsonc',
      envVars,
    });
    return await worker.fetch(req);
  } catch (e) {
    const message = String(e);
    const status = message.includes('could not find') || message.includes('No such file') ? 404 : 500;
    console.error(`[main] ${serviceName}:`, message);
    return Response.json({ message: status === 404 ? 'function not found' : 'function failed to start' }, { status });
  }
});
