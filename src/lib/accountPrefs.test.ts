import { test } from "node:test";
import assert from "node:assert/strict";
import { prefsFromMetadata, prefsToMetadata } from "./accountPrefs.ts";

test("both alert switches round-trip through the account", () => {
  assert.deepEqual(prefsFromMetadata(prefsToMetadata({ alerts: false, sound: true })), { alerts: false, sound: true });
});

test("nothing saved returns null, so this browser's copy is used", () => {
  assert.equal(prefsFromMetadata({ full_name: "Maria" }), null);
  assert.equal(prefsFromMetadata(null), null);
});

test("a missing switch counts as on", () => {
  assert.deepEqual(prefsFromMetadata({ alerts_enabled: false }), { alerts: false, sound: true });
});
