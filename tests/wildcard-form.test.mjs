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
  locked: false, lock_eligible: true, wildcards_allowed: true,
};
const prediction = { event_id: "event", selected_option: "A", is_locked: false };

function render(props = {}) {
  return renderToStaticMarkup(React.createElement(Form, {
    userId: "player", events: [event], existingPredictions: [prediction],
    submissionsOpen: false, wildcardUses: 0, loadError: null, ...props,
  }));
}

test("closed submissions show a wildcard action for an unlocked pick", () => {
  const html = render();
  assert.match(html, /Wildcards remaining: 2 \/ 2/);
  assert.match(html, /Wildcards allowed for this event/);
  assert.match(html, /Use wildcard/);
  assert.match(html, /Locked picks cannot be changed/);
  assert.doesNotMatch(html, /Save predictions/);
});

test("wildcards are unavailable for locked picks, disabled events, unsaved picks or an empty balance", () => {
  const noWildcard = render({ events: [{ ...event, wildcards_allowed: false }] });
  assert.match(noWildcard, /Wildcards unavailable for this event/);
  assert.match(noWildcard, /disabled=""[^>]*>Use wildcard/);
  const locked = render({ existingPredictions: [{ ...prediction, is_locked: true }] });
  assert.match(locked, /Locked picks cannot be changed with a wildcard/);
  assert.match(locked, /disabled=""[^>]*>Use wildcard/);
  assert.match(locked, /<select[^>]*disabled=""/);
  const noPick = render({ existingPredictions: [] });
  assert.doesNotMatch(noPick, /Use wildcard/);
  const exhausted = render({ wildcardUses: 2 });
  assert.match(exhausted, /Wildcards remaining: 0 \/ 2/);
  assert.match(exhausted, /disabled=""[^>]*>Use wildcard/);
});
