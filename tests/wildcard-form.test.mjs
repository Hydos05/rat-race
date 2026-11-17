import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const requireDependency = createRequire(import.meta.url);
const source = fs.readFileSync("src/app/predict/PredictionForm.tsx", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const compiledModule = { exports: {} };
const dependencies = {
  "@/lib/supabase/client": { createClient: () => { throw new Error("Unexpected client"); } },
  "@/lib/constants": { MAX_LOCKS: 3, LOCK_MULTIPLIER: 2, MAX_WILDCARDS: 2 },
  "@/lib/eventOptions": { OTHER_OPTION: "Other", cleanOptions: (options) => options },
};
vm.runInNewContext(compiled, {
  module: compiledModule,
  exports: compiledModule.exports,
  require: (name) => dependencies[name] ?? requireDependency(name),
});
const Form = compiledModule.exports.default;
const event = {
  id: "event", name: "Final", category: "AFL", options: ["A", "B"],
  locked: false, lock_eligible: true, starts_at: "2030-01-01T10:00:00Z",
};
const prediction = { event_id: "event", selected_option: "A", is_locked: true };

function render(props = {}) {
  return renderToStaticMarkup(React.createElement(Form, {
    userId: "player", events: [event], existingPredictions: [prediction],
    submissionsOpen: false, wildcardUses: 0, loadError: null, ...props,
  }));
}

test("closed submissions show a wildcard action and preserve the lock", () => {
  const html = render();
  assert.match(html, /Wildcards remaining: 2 \/ 2/);
  assert.match(html, /Wildcard cutoff: 2030-01-01 10:00 UTC/);
  assert.match(html, /Use wildcard/);
  assert.match(html, /Existing Locks remain unchanged/);
  assert.doesNotMatch(html, /Save predictions/);
});

test("wildcards are unavailable without a cutoff, a saved pick, or a balance", () => {
  const noCutoff = render({ events: [{ ...event, starts_at: null }] });
  assert.match(noCutoff, /unavailable until the event start time is set/);
  assert.match(noCutoff, /disabled=""[^>]*>Use wildcard/);
  const noPick = render({ existingPredictions: [] });
  assert.doesNotMatch(noPick, /Use wildcard/);
  const exhausted = render({ wildcardUses: 2 });
  assert.match(exhausted, /Wildcards remaining: 0 \/ 2/);
  assert.match(exhausted, /disabled=""[^>]*>Use wildcard/);
});
