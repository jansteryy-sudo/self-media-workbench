import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { sealSecret, unsealSecret } from "../src/lib/studio-secrets";
test("desktop keys are encrypted, authenticated and tied to the vault key",()=>{
 const previous=process.env.WORKBENCH_ENCRYPTION_KEY;
 const desktop=process.env.WORKBENCH_DESKTOP_TOKEN;
 try {
  process.env.WORKBENCH_ENCRYPTION_KEY=randomBytes(32).toString('base64');
  process.env.WORKBENCH_DESKTOP_TOKEN='test-session';
  const input='test-only-not-a-real-api-key';
  const sealed=sealSecret(input);
  assert.ok(!sealed.includes(input));assert.equal(unsealSecret(sealed),input);
  assert.throws(()=>unsealSecret(input));
  process.env.WORKBENCH_ENCRYPTION_KEY=randomBytes(32).toString('base64');
  assert.throws(()=>unsealSecret(sealed));
  delete process.env.WORKBENCH_ENCRYPTION_KEY;
  assert.throws(()=>sealSecret(input));
 } finally {
  if(previous)process.env.WORKBENCH_ENCRYPTION_KEY=previous;else delete process.env.WORKBENCH_ENCRYPTION_KEY;
  if(desktop)process.env.WORKBENCH_DESKTOP_TOKEN=desktop;else delete process.env.WORKBENCH_DESKTOP_TOKEN;
 }
});
