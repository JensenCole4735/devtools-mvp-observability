import test from "node:test";
import assert from "node:assert/strict";
import { releaseBody, releaseDecision } from "./observability_service.ts";

test("small releases are observed while broad changes wait for review", () => {
  const input = releaseBody.parse({ service: "api", version: "1.2.0", actor: "founder", changedFiles: 12 });
  assert.equal(releaseDecision(input), "observe");
  assert.equal(releaseDecision({ ...input, changedFiles: 26 }), "hold");
});
