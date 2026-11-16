import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const requireDependency = createRequire(import.meta.url);

function load(file, dependencies) {
  const source = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) => dependencies[name] ?? requireDependency(name),
    URL,
    window: { location: { origin: "https://example.test" } },
    console,
  });
  return compiledModule.exports;
}

function makeForm(file, auth) {
  const state = [];
  let index = 0;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const component = load(file, {
    react: {
      useState(initial) {
        const current = index++;
        if (!(current in state)) state[current] = initial;
        return [state[current], (value) => { state[current] = value; }];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/link": { default: "a" },
    "@/lib/supabase/client": { createClient: () => ({ auth }) },
  }).default;
  function render() { index = 0; return component(); }
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
  return {
    render,
    find,
    change(id, value) {
      find(render(), (node) => node.props.id === id).props.onChange({ target: { value } });
    },
    async submit() {
      await find(render(), (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    },
  };
}

test("sends a reset request with the callback URL and gives a generic confirmation", async () => {
  let request;
  const form = makeForm("src/app/forgot-password/page.tsx", {
    resetPasswordForEmail: async (email, options) => {
      request = { email, redirectTo: options.redirectTo };
      return { error: null };
    },
  });
  form.change("email", " player@example.test ");
  await form.submit();
  assert.equal(request.email, "player@example.test");
  assert.equal(request.redirectTo, "https://example.test/auth/reset-password");
  assert.match(form.find(form.render(), (node) => node.props.role === "status").props.children, /If an account exists/);
});

test("reports a reset request failure without showing account details", async () => {
  const form = makeForm("src/app/forgot-password/page.tsx", {
    resetPasswordForEmail: async () => ({ error: { message: "private details" } }),
  });
  form.change("email", "player@example.test");
  await form.submit();
  assert.match(form.find(form.render(), (node) => node.props.role === "alert").props.children, /Could not send/);
});

test("only updates matching valid passwords and reports a successful update", async () => {
  const updates = [];
  const form = makeForm("src/app/reset-password/ResetPasswordForm.tsx", {
    updateUser: async (value) => { updates.push(value.password); return { error: null }; },
  });
  form.change("password", "short");
  form.change("confirmPassword", "short");
  await form.submit();
  assert.equal(updates.length, 0);
  form.change("password", "long-enough");
  form.change("confirmPassword", "different");
  await form.submit();
  assert.equal(updates.length, 0);
  form.change("confirmPassword", "long-enough");
  await form.submit();
  assert.deepEqual(updates, ["long-enough"]);
  assert.match(form.find(form.render(), (node) => node.props.role === "status").props.children, /updated/);
});

test("shows password update errors and keeps the form available", async () => {
  const form = makeForm("src/app/reset-password/ResetPasswordForm.tsx", {
    updateUser: async () => ({ error: { message: "Password rejected" } }),
  });
  form.change("password", "long-enough");
  form.change("confirmPassword", "long-enough");
  await form.submit();
  assert.equal(form.find(form.render(), (node) => node.props.role === "alert").props.children, "Password rejected");
  assert.ok(form.find(form.render(), (node) => node.type === "form"));
});

test("exchanges a recovery code and rejects missing or expired codes", async () => {
  let result = { error: null };
  let receivedCode;
  const { GET } = load("src/app/auth/reset-password/route.ts", {
    "next/server": { NextResponse: { redirect: (url) => url.toString() } },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: { exchangeCodeForSession: async (code) => { receivedCode = code; return result; } },
      }),
    },
  });
  const request = (query) => {
    const url = `https://example.test/auth/reset-password${query}`;
    return { url, nextUrl: new URL(url) };
  };
  assert.equal(await GET(request("?code=valid")), "https://example.test/reset-password");
  assert.equal(receivedCode, "valid");
  assert.equal(await GET(request("")), "https://example.test/reset-password?error=invalid");
  result = { error: { message: "expired" } };
  assert.equal(await GET(request("?code=expired")), "https://example.test/reset-password?error=invalid");
});
