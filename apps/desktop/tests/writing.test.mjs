import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readText = (path) => readFile(new URL(path, root), "utf8");

test("the cloud writing service goes through the proxy, never a key", async () => {
  const service = await readText("src/services/ai.ts");

  // The client is given the address of the proxy and the token of this run.
  assert.match(service, /call<WritingProxy>\("writing_proxy"\)/);
  assert.match(service, /baseUrl: base/);
  assert.match(service, /proxy\.baseUrl/);
  assert.match(service, /apiKey: key/);
  // The retired commands sent the whole request to Rust. Nothing may call them.
  assert.doesNotMatch(service, /openrouter_generate|openrouter_agent_generate/);
  // A key never reaches the WebView, so the service never asks for one.
  assert.doesNotMatch(service, /providerKey|provider_key/);
});

test("the backend serves the proxy and no longer answers the retired commands", async () => {
  const commands = await readText("src-tauri/src/lib.rs");
  assert.match(commands, /rpc::writing_proxy/);
  assert.doesNotMatch(commands, /openrouter_generate|openrouter_agent_generate/);

  const proxy = await readText("src-tauri/src/proxy.rs");
  // One path, on the loopback, behind a token that lasts one run.
  assert.match(proxy, /TcpListener::bind\(\("127\.0\.0\.1", 0\)\)/);
  assert.match(proxy, /"\/v1\/chat\/completions"/);
  assert.match(proxy, /StatusCode::UNAUTHORIZED/);
});

test("Apple Intelligence still answers on this Mac", async () => {
  const service = await readText("src/services/ai.ts");
  // Plain text still goes straight to the sidecar command.
  assert.match(service, /"apfel_generate"/);
  // The agent reaches it through the proxy, because the sidecar answers a
  // loopback origin only and the WebView is not one.
  assert.match(service, /proxy\.appleUrl/);
  // Its answers cost nothing, because they never leave the Mac.
  assert.match(service, /service === "apple" \|\| model\.endsWith\(":free"\)/);
});

test("the proxy carries the on-Mac model as well as the cloud one", async () => {
  const proxy = await readText("src-tauri/src/proxy.rs");
  assert.match(proxy, /"\/apple\/v1\/chat\/completions"/);
  // The sidecar holds its own token, and the run token never reaches it.
  assert.match(proxy, /fn apple_completions/);
  const commands = await readText("src-tauri/src/lib.rs");
  assert.doesNotMatch(commands, /apfel_agent_generate/);
});
