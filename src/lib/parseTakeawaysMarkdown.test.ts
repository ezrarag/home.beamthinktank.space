import assert from "node:assert/strict";
import test from "node:test";
import { parseTakeawaysMarkdown } from "./parseTakeawaysMarkdown";

test("parses repeated Markdown headings into takeaways", () => {
  assert.deepEqual(parseTakeawaysMarkdown("## Decision\nFund the pilot.\n\n## Next step\n- Draft the memo.\n- Assign an owner."), [
    { heading: "Decision", body: "Fund the pilot." },
    { heading: "Next step", body: "Draft the memo.\nAssign an owner." },
  ]);
});

test("supports NotebookLM bold-label blocks", () => {
  assert.deepEqual(parseTakeawaysMarkdown("**Shared priority**\nBuild a common intake process."), [
    { heading: "Shared priority", body: "Build a common intake process." },
  ]);
});
