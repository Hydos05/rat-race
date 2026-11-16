import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

const requireDependency = createRequire(import.meta.url);

function loadTypeScript(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) => dependencies[name] ?? requireDependency(name),
    console,
  });
  return compiledModule.exports;
}

const { fetchAllRows } = loadTypeScript("src/lib/supabase/fetchAllRows.ts");

function makePage({ signedIn = true, failTable, cap = 500 } = {}) {
  const events = Array.from({ length: 1001 }, (_, index) => ({
    id: `e${index}`,
    name: `Event ${index}`,
    category: index < 501 ? "AFL" : "Soccer",
  }));
  const tables = {
    events,
    users: [{ id: "u1", full_name: "Zoe" }, { id: "u2", full_name: "Alex" }],
    predictions: events.map((event) => ({
      user_id: "u1",
      event_id: event.id,
      selected_option: `Pick ${event.id}`,
    })),
  };
  let adminCalls = 0;
  const selections = [];
  const admin = {
    from(table) {
      const query = {
        select(columns) { selections.push([table, columns]); return query; },
        order() { return query; },
        range(from, to) {
          return Promise.resolve(failTable === table
            ? { data: null, error: { message: "Database unavailable" } }
            : { data: tables[table].slice(from, Math.min(to + 1, from + cap)), error: null });
        },
      };
      return query;
    },
  };
  const page = loadTypeScript("src/app/picks/page.tsx", {
    "next/navigation": { redirect: (url) => { throw new Error(`redirect:${url}`); } },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: signedIn ? { id: "u1" } : null }, error: null }) },
      }),
    },
    "@/lib/supabase/admin": { createAdminClient: () => { adminCalls++; return admin; } },
    "@/lib/supabase/fetchAllRows": { fetchAllRows },
  }).default;
  return { page, selections, getAdminCalls: () => adminCalls };
}

test("requires sign-in before accessing all picks", async () => {
  const { page, getAdminCalls } = makePage({ signedIn: false });
  await assert.rejects(page(), /redirect:\/login/);
  assert.equal(getAdminCalls(), 0);
});

test("renders all paginated picks in grouped event rows and sorted user columns", async () => {
  const { page, selections } = makePage();
  const html = renderToStaticMarkup(await page());
  assert.ok(html.indexOf("Alex") < html.indexOf("Zoe"));
  assert.ok(html.indexOf("AFL") < html.indexOf("Soccer"));
  assert.match(html, /Event 1000/);
  assert.match(html, /Pick e1000/);
  assert.match(html, /aria-label="No saved pick"/);
  assert.ok(selections.every(([, columns]) => !columns.includes("email")));
});

test("reports a database failure instead of displaying incomplete picks", async () => {
  const { page } = makePage({ failTable: "predictions" });
  const html = renderToStaticMarkup(await page());
  assert.match(html, /Could not load picks/);
  assert.doesNotMatch(html, /<table/);
});
