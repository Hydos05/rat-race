import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

const requireDependency = createRequire(import.meta.url);

function load(file, dependencies = {}, globals = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
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
    Response,
    ...globals,
  });
  return compiledModule.exports;
}

const scoring = load("src/lib/scoring.ts", {
  "@/lib/constants": { POINTS_PER_EVENT: 100, LOCK_MULTIPLIER: 2 },
});
const { fetchAllRows } = load("src/lib/supabase/fetchAllRows.ts");

function fixture() {
  return {
    leaderboard: [
      { user_id: "u1", total_points: 30, updated_at: "now" },
      { user_id: "u2", total_points: 70, updated_at: "now" },
      { user_id: "u3", total_points: 0, updated_at: "now" },
    ],
    users: ["u1", "u2", "u3", "u4", "u5"].map((id) => ({
      id, full_name: id, email: `${id}@example.test`,
    })),
    events: [
      { id: "completed", correct_answer: "Winner" },
      { id: "open1", correct_answer: null },
      { id: "open2", correct_answer: null },
      { id: "open3", correct_answer: "" },
    ],
    predictions: [
      { user_id: "u1", event_id: "completed", selected_option: "Wrong", is_locked: true },
      { user_id: "u2", event_id: "completed", selected_option: "Winner", is_locked: false },
      { user_id: "u1", event_id: "open1", selected_option: "Eagles", is_locked: true },
      { user_id: "u2", event_id: "open1", selected_option: " EAGLES ", is_locked: false },
      { user_id: "u4", event_id: "open1", selected_option: "Eagles", is_locked: false },
      { user_id: "u3", event_id: "open1", selected_option: "Other", is_locked: false },
      { user_id: "u1", event_id: "open2", selected_option: "Solo", is_locked: false },
      { user_id: "u2", event_id: "open2", selected_option: "Pair", is_locked: false },
      { user_id: "u3", event_id: "open2", selected_option: "Pair", is_locked: false },
      { user_id: "u2", event_id: "open3", selected_option: "Empty result", is_locked: false },
    ],
  };
}

function makeLeaderboard({ failTable, tables = fixture() } = {}) {
  const requests = [];
  const client = {
    from(table) {
      const query = {
        select() { return query; },
        order() { return query; },
        range(from, to) {
          requests.push({ table, from, to });
          return Promise.resolve(failTable === table
            ? { data: null, error: { message: "Database unavailable" } }
            : { data: tables[table].slice(from, Math.min(to + 1, from + 2)), error: null });
        },
      };
      return query;
    },
  };
  const lib = load("src/lib/leaderboard.ts", {
    "@/lib/supabase/admin": { createAdminClient: () => client },
    "@/lib/supabase/fetchAllRows": { fetchAllRows },
    "@/lib/scoring": scoring,
  });
  return { ...lib, requests };
}

test("adds only unresolved picks to actual scores using shared answers and locks", async () => {
  const { getLeaderboard, requests } = makeLeaderboard();
  const entries = await getLeaderboard();
  assert.equal(entries.length, 5);
  assert.equal(entries[0].user_id, "u2");
  const user = (id) => entries.find((entry) => entry.user_id === id);
  assert.equal(user("u1").total_points, 30);
  assert.equal(user("u1").possible_points, 196.67);
  assert.equal(user("u2").possible_points, 253.33);
  assert.equal(user("u3").possible_points, 150);
  assert.equal(user("u4").total_points, 0);
  assert.equal(user("u4").possible_points, 33.33);
  assert.equal(user("u4").updated_at, null);
  assert.equal(user("u5").possible_points, 0);
  assert.ok(requests.some((request) => request.table === "predictions" && request.from >= 2));
  assert.ok(requests.some((request) => request.table === "users" && request.from >= 2));
});

test("does not produce partial possible totals when a database query fails", async () => {
  const { getLeaderboard } = makeLeaderboard({ failTable: "predictions" });
  await assert.rejects(getLeaderboard(), /Database unavailable/);
});

test("ranks by actual points first, then possible points, then user ID", async () => {
  const tables = fixture();
  tables.leaderboard[0].total_points = 70;
  tables.leaderboard[2].total_points = 71;
  const { getLeaderboard } = makeLeaderboard({ tables });
  const entries = await getLeaderboard();
  assert.equal(entries.map((entry) => entry.user_id).join(","), "u3,u2,u1,u4,u5");

  tables.predictions = [];
  const tied = await getLeaderboard();
  assert.equal(tied.map((entry) => entry.user_id).join(","), "u3,u1,u2,u4,u5");
});

test("leaderboard API sends current totals without prediction details and disables caching", async () => {
  const { getLeaderboard } = makeLeaderboard();
  const { GET } = load("src/app/api/leaderboard/route.ts", {
    "@/lib/leaderboard": { getLeaderboard },
  });
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const entries = await response.json();
  assert.equal(entries.find((entry) => entry.user_id === "u1").possible_points, 196.67);
  assert.doesNotMatch(JSON.stringify(entries), /selected_option|Eagles/);
});

test("renders actual and possible points together", () => {
  const Table = load("src/app/leaderboard/LeaderboardTable.tsx").default;
  const React = requireDependency("react");
  const html = renderToStaticMarkup(React.createElement(Table, {
    entries: [{ user_id: "u1", total_points: 30, possible_points: 196.67, full_name: "Player" }],
  }));
  assert.match(html, /Points \/ possible/);
  assert.match(html, /30 \/ 196\.67/);
});
