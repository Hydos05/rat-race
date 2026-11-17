import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const requireDependency = createRequire(import.meta.url);

function setup() {
  const element = { scrollWidth: 1400, clientWidth: 400, scrollLeft: 0, firstElementChild: {} };
  const state = [];
  let stateIndex = 0;
  let effect;
  let observer;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const dependencies = {
    react: {
      useRef: () => ({ current: element }),
      useState(initial) {
        const index = stateIndex++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (value) => { state[index] = value; }];
      },
      useEffect: (callback) => { effect ??= callback; },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
  };
  class MockResizeObserver {
    constructor(callback) { this.callback = callback; this.observed = []; }
    observe(target) { this.observed.push(target); }
    disconnect() { this.disconnected = true; }
  }
  const code = ts.transpileModule(fs.readFileSync("src/app/picks/PicksTableScroller.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(code, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) => dependencies[name] ?? requireDependency(name),
    ResizeObserver: class extends MockResizeObserver {
      constructor(callback) {
        super(callback);
        observer = { callback, observed: this.observed, instance: this };
      }
    },
  });
  function render() { stateIndex = 0; return compiledModule.exports.default({ children: "table" }); }
  function find(node, predicate) {
    if (!node || typeof node !== "object") return undefined;
    if (predicate(node)) return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const result = find(child, predicate);
      if (result) return result;
    }
    return undefined;
  }
  render();
  const cleanup = effect();
  return { element, render, find, observer, cleanup };
}

test("keeps the sticky slider and table scroll position in sync in both directions", () => {
  const { element, render, find } = setup();
  const slider = () => find(render(), (node) => node.type === "input");
  assert.equal(slider().props.max, 1000);
  assert.match(find(render(), (node) => node.props.className?.includes("sticky bottom-0")).props.className, /sticky/);
  slider().props.onChange({ target: { value: "700" } });
  assert.equal(element.scrollLeft, 700);
  assert.equal(slider().props.value, 700);
  element.scrollLeft = 250;
  find(render(), (node) => node.props.role === "region").props.onScroll({ currentTarget: element });
  assert.equal(slider().props.value, 250);
});

test("updates the range on resize and hides it when the table fits", () => {
  const { element, render, find, observer, cleanup } = setup();
  assert.equal(observer.observed.length, 2);
  element.clientWidth = 1000;
  observer.callback();
  assert.equal(find(render(), (node) => node.type === "input").props.max, 400);
  element.clientWidth = 1400;
  observer.callback();
  assert.equal(find(render(), (node) => node.type === "input"), undefined);
  cleanup();
  assert.equal(observer.instance.disconnected, true);
});
