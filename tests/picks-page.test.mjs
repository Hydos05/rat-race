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
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
    },
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
const scoring = loadTypeScript("src/lib/scoring.ts", {
  "@/lib/constants": { POINTS_PER_EVENT: 100, LOCK_MULTIPLIER: 2 },
});

function makePage({ signedIn = true, failTable, cap = 500, tableData } = {}) {
  const events = Array.from({ length: 1001 }, (_, index) => ({
    id: `e${index}`,
    name: `Event ${index}`,
    category: index < 501 ? "AFL" : "Soccer",
  }));
  const tables = tableData ?? {
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
    "@/lib/scoring": scoring,
    "./PicksTableScroller": { default: ({ children }) => children },
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

test("shows rounded potential points by event and pick, with locks doubled", async () => {
  const users = Array.from({ length: 8 }, (_, index) => ({
    id: `u${index}`,
    full_name: `User ${index}`,
  }));
  const predictions = [
    ...users.slice(0, 6).map((user, index) => ({
      user_id: user.id,
      event_id: "afl",
      selected_option: index === 1 ? "  EAGLES  " : "Eagles",
      is_locked: index === 0,
    })),
    { user_id: "u6", event_id: "afl", selected_option: "Dockers", is_locked: false },
    { user_id: "u0", event_id: "soccer", selected_option: "Eagles", is_locked: false },
  ];
  const { page } = makePage({
    cap: 3,
    tableData: {
      events: [
        { id: "afl", name: "AFL premier", category: "AFL" },
        { id: "soccer", name: "Soccer champion", category: "Soccer" },
      ],
      users,
      predictions,
    },
  });
  const html = renderToStaticMarkup(await page());
  const aflRow = html.match(/<tr[^>]*><th scope="row"[^>]*>AFL premier<\/th>.*?<\/tr>/)?.[0];
  const soccerRow = html.match(/<tr[^>]*><th scope="row"[^>]*>Soccer champion<\/th>.*?<\/tr>/)?.[0];
  assert.ok(aflRow);
  assert.ok(soccerRow);
  assert.equal((aflRow.match(/17 points if correct/g) ?? []).length, 5);
  assert.equal((aflRow.match(/33 points if correct \(locked\)/g) ?? []).length, 1);
  assert.equal((aflRow.match(/100 points if correct/g) ?? []).length, 1);
  assert.match(aflRow, /aria-label="No saved pick"/);
  assert.equal((soccerRow.match(/100 points if correct/g) ?? []).length, 1);
  const cells = [...aflRow.matchAll(/<td[^>]*>.*?<\/td>/g)].map(([cell]) => cell);
  assert.match(cells[0], /background-color:hsl\(72 85% 72%\).*33 points if correct \(locked\)/);
  assert.match(cells[1], /background-color:hsl\(24 85% 72%\).*17 points if correct/);
  assert.match(cells[6], /background-color:hsl\(240 85% 85%\).*100 points if correct/);
  assert.doesNotMatch(cells[7], /background-color/);
  assert.match(html, /Pick value colour key/);
  assert.match(html, /leaderboard uses two decimal places/);
});

test("colours rounded values including locked picks above 100", async () => {
  const { page } = makePage({
    tableData: {
      events: [{ id: "event", name: "Final", category: "AFL" }],
      users: Array.from({ length: 6 }, (_, index) => ({ id: `u${index}`, full_name: `User ${index}` })),
      predictions: [
        { user_id: "u0", event_id: "event", selected_option: "Solo", is_locked: true },
        { user_id: "u1", event_id: "event", selected_option: "Pair", is_locked: false },
        { user_id: "u2", event_id: "event", selected_option: "Pair", is_locked: false },
        ...[3, 4, 5].map((index) => ({
          user_id: `u${index}`, event_id: "event", selected_option: "Trio", is_locked: index === 3,
        })),
      ],
    },
  });
  const html = renderToStaticMarkup(await page());
  const row = html.match(/<tr[^>]*><th scope="row"[^>]*>Final<\/th>.*?<\/tr>/)?.[0];
  assert.ok(row);
  const cells = [...row.matchAll(/<td[^>]*>.*?<\/td>/g)].map(([cell]) => cell);
  assert.match(cells[0], /background-color:hsl\(240 85% 85%\).*200 points if correct \(locked\)/);
  assert.match(cells[1], /background-color:hsl\(120 85% 72%\).*50 points if correct/);
  assert.match(cells[2], /background-color:hsl\(120 85% 72%\).*50 points if correct/);
  assert.match(cells[3], /background-color:hsl\(144 85% 85%\).*67 points if correct \(locked\)/);
  assert.match(cells[4], /background-color:hsl\(72 85% 72%\).*33 points if correct/);
  assert.match(cells[5], /background-color:hsl\(72 85% 72%\).*33 points if correct/);
});

test("places 9 and 10 point picks in different ten-point bands", async () => {
  const users = Array.from({ length: 21 }, (_, index) => ({
    id: `u${index}`,
    full_name: `User ${String(index).padStart(2, "0")}`,
  }));
  const { page } = makePage({
    tableData: {
      events: [{ id: "event", name: "Final", category: "AFL" }],
      users,
      predictions: users.map((user, index) => ({
        user_id: user.id,
        event_id: "event",
        selected_option: index < 11 ? "Eleven" : "Ten",
        is_locked: false,
      })),
    },
  });
  const html = renderToStaticMarkup(await page());
  const row = html.match(/<tr[^>]*><th scope="row"[^>]*>Final<\/th>.*?<\/tr>/)?.[0];
  assert.ok(row);
  const cells = [...row.matchAll(/<td[^>]*>.*?<\/td>/g)].map(([cell]) => cell);
  assert.match(cells[0], /background-color:hsl\(0 85% 85%\).*9 points if correct/);
  assert.match(cells[11], /background-color:hsl\(24 85% 72%\).*10 points if correct/);
  assert.match(html, />100\+<\/li>/);
  assert.doesNotMatch(html, />110-119<\/li>/);
});

test("leaderboard scoring retains two-decimal shares and the lock multiplier", () => {
  const predictions = Array.from({ length: 6 }, (_, index) => ({
    user_id: `u${index}`,
    selected_option: index === 1 ? "  EAGLES " : "Eagles",
    is_locked: index === 0,
  }));
  predictions.push({ user_id: "u6", selected_option: "Dockers", is_locked: false });
  const scores = scoring.calculateEventPoints(predictions, "eagles");
  assert.equal(scores.length, 6);
  assert.equal(scores[0].points, 33.33);
  assert.equal(scores[1].points, 16.67);
  assert.equal(scoring.calculateEventPoints(predictions, null).length, 0);
});

test("reports a database failure instead of displaying incomplete picks", async () => {
  const { page } = makePage({ failTable: "predictions" });
  const html = renderToStaticMarkup(await page());
  assert.match(html, /Could not load picks/);
  assert.doesNotMatch(html, /<table/);
});
