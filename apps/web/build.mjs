// Production build entry.
//
// We drive Vite's builder via its JS API instead of the `vite build` CLI
// because the process otherwise never exits. Vite 8 bundles with Rolldown
// (Rust/napi), and after the build + prerender finish, Rolldown's
// `napi_rs_threadsafe_function` handles (from its builtin plugins and
// `bundle.write`) stay referenced and never close — multiplied by the
// separate client/server environments TanStack Start builds. The event loop
// has no real work left but Node can't exit, so `vite build` hangs forever
// (which stalled CI indefinitely).
//
// All output is fully written to disk by the time `buildApp()` resolves, so
// we exit explicitly once it does.
import { createBuilder } from 'vite';

try {
  const builder = await createBuilder({ mode: 'production' });
  await builder.buildApp();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
