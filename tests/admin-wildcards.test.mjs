import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const requireDependency = createRequire(import.meta.url);
const source = fs.readFileSync("src/app/api/admin/wildcards/route.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function route(result = { data: [{ id: "event" }], error: null }) {
  const calls = [];
  const compiledModule = { exports: {} };
  const dependencies = {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "@/lib/supabase/admin": {
      isValidAdminKey: (key) => key === "admin-test",
      createAdminClient: () => ({
        from(table) {
          calls.push({ table });
          return {
            update(values) {
              calls.at(-1).values = values;
              return {
                eq(column, value) {
                  calls.at(-1).filter = [column, value];
                  return { select: async () => result };
                },
              };
            },
          };
        },
      }),
    },
  };
  vm.runInNewContext(compiled, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) => dependencies[name] ?? requireDependency(name),
  });
  return {
    calls,
    post: (body) => compiledModule.exports.POST(new Request("https://example.test/api/admin/wildcards", {
      method: "POST", body: JSON.stringify(body),
    })),
  };
}

test("requires an admin key and a boolean toggle", async () => {
  const handler = route();
  assert.equal((await handler.post({ adminKey: "wrong", eventId: "event", wildcardsAllowed: true })).status, 401);
  assert.equal((await handler.post({ adminKey: "admin-test", eventId: "event", wildcardsAllowed: "false" })).status, 400);
  assert.equal(handler.calls.length, 0);
});

test("updates only the requested event and reports missing events and database failures", async () => {
  const handler = route();
  assert.equal((await handler.post({ adminKey: "admin-test", eventId: "event", wildcardsAllowed: false })).status, 200);
  assert.equal(handler.calls[0].table, "events");
  assert.equal(handler.calls[0].values.wildcards_allowed, false);
  assert.deepEqual(handler.calls[0].filter, ["id", "event"]);
  const missing = route({ data: [], error: null });
  assert.equal((await missing.post({ adminKey: "admin-test", eventId: "missing", wildcardsAllowed: true })).status, 404);
  const failed = route({ data: null, error: { message: "Database unavailable" } });
  assert.equal((await failed.post({ adminKey: "admin-test", eventId: "event", wildcardsAllowed: true })).status, 500);
});
