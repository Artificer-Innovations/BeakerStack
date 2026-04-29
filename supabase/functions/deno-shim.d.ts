/**
 * Ambient typings for the Deno global in Supabase Edge Functions.
 * The runtime provides the real Deno object; this file exists so the workspace TypeScript
 * language service (Node-style projects) can typecheck supabase/functions sources without
 * requiring the Deno VS Code extension for this folder.
 */
declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
  }

  const env: Env;

  function serve(handler: (request: Request) => Response | Promise<Response>): {
    shutdown(): Promise<void>;
    finished: Promise<void>;
  };
}
