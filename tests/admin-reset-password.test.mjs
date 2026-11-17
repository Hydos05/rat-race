import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const requireDependency = createRequire(import.meta.url);
const userId = "00000000-0000-0000-0000-000000000001";

function load(file, dependencies, globals = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
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
    console,
    ...globals,
  });
  return compiledModule.exports;
}

function makeRoute(updateUserById) {
  let adminCalls = 0;
  const { POST } = load("src/app/api/admin/reset-password/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "@/lib/supabase/admin": {
      isValidAdminKey: (key) => key === "admin-test",
      createAdminClient: () => {
        adminCalls++;
        return { auth: { admin: { updateUserById } } };
      },
    },
  });
  return {
    post: (body) => POST(new Request("https://example.test/api/admin/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    })),
    getAdminCalls: () => adminCalls,
  };
}

test("rejects unauthorised and invalid requests without calling Supabase", async () => {
  const route = makeRoute(() => { throw new Error("should not be called"); });
  assert.equal((await route.post({ adminKey: "wrong", userId, password: "a-valid-password" })).status, 401);
  for (const body of [
    { adminKey: "admin-test", userId: "invalid", password: "a-valid-password" },
    { adminKey: "admin-test", userId, password: "short" },
    { adminKey: "admin-test", userId, password: "            " },
    { adminKey: "admin-test", userId, password: 123456789012 },
  ]) {
    assert.equal((await route.post(body)).status, 400);
  }
  assert.equal(route.getAdminCalls(), 0);
});

test("sets the selected user's password without returning it or user data", async () => {
  let received;
  const route = makeRoute(async (id, attributes) => {
    received = { id, password: attributes.password };
    return { data: { user: { email: "private@example.test" } }, error: null };
  });
  const response = await route.post({ adminKey: "admin-test", userId, password: "temporary password" });
  assert.equal(response.status, 200);
  assert.equal(received.id, userId);
  assert.equal(received.password, "temporary password");
  assert.deepEqual(await response.json(), { success: true });
});

test("reports provider errors without exposing sensitive provider details", async () => {
  const route = makeRoute(async () => ({
    error: { status: 422, code: "weak_password", message: "private details" },
  }));
  const response = await route.post({ adminKey: "admin-test", userId, password: "temporary password" });
  assert.equal(response.status, 400);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private details/);
});

function makeForm(confirm, fetch) {
  const state = [];
  let index = 0;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const component = load("src/app/admin/ResetUserPassword.tsx", {
    react: {
      useState(initial) {
        const current = index++;
        if (!(current in state)) state[current] = initial;
        return [state[current], (value) => { state[current] = value; }];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
  }, { window: { confirm }, fetch }).default;
  const props = { adminKey: "admin-test", userId, name: "Player", email: "player@example.test" };
  function render() { index = 0; return component(props); }
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
  function findAll(node, predicate, result = []) {
    if (!node || typeof node !== "object") return result;
    if (predicate(node)) result.push(node);
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) findAll(child, predicate, result);
    return result;
  }
  return {
    render,
    find,
    open() { find(render(), (node) => node.type === "button").props.onClick(); },
    change(index, value) {
      findAll(render(), (node) => node.type === "input")[index].props.onChange({ target: { value } });
    },
    async submit() {
      await find(render(), (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    },
  };
}

test("requires matching passwords and confirmation before sending a reset", async () => {
  const requests = [];
  let confirmed = false;
  const form = makeForm(() => confirmed, async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ success: true }) };
  });
  form.open();
  form.change(0, "temporary password");
  form.change(1, "different password");
  await form.submit();
  assert.equal(requests.length, 0);
  assert.equal(form.find(form.render(), (node) => node.props.role === "alert").props.children, "Passwords do not match.");
  form.change(1, "temporary password");
  await form.submit();
  assert.equal(requests.length, 0);
  confirmed = true;
  await form.submit();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/admin/reset-password");
  assert.deepEqual(requests[0].body, { adminKey: "admin-test", userId, password: "temporary password" });
  assert.match(form.find(form.render(), (node) => node.props.role === "status").props.children, /Password updated/);
  form.open();
  assert.equal(form.find(form.render(), (node) => node.type === "input").props.value, "");
});

test("shows reset failures without claiming success", async () => {
  const form = makeForm(() => true, async () => ({
    ok: false,
    json: async () => ({ error: "Password reset failed." }),
  }));
  form.open();
  form.change(0, "temporary password");
  form.change(1, "temporary password");
  await form.submit();
  assert.equal(form.find(form.render(), (node) => node.props.role === "alert").props.children, "Password reset failed.");
  assert.equal(form.find(form.render(), (node) => node.props.role === "status"), undefined);
});
