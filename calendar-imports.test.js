const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('index.html', 'utf8');

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist in index.html`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test('new spreadsheet imports are added without deleting earlier calendars', () => {
  const handle = functionSource('handleFile');
  const confirm = functionSource('confirmImport');
  assert.doesNotMatch(handle, /replaceExisting/);
  assert.doesNotMatch(confirm, /del\('imports'/);
  assert.doesNotMatch(confirm, /del\('tasks'/);
  assert.match(confirm, /name:String\(c\.fileName/);
  assert.match(confirm, /state\.progressImportId=importId/);
});

test('progress page exposes a separate view for every imported calendar', () => {
  const render = functionSource('renderAnalytics');
  assert.match(render, /scopeTasks=selectedImport\?state\.tasks\.filter\(t=>t\.import_id===selectedImport\.id\):state\.tasks/);
  assert.match(render, /All calendars/);
  assert.match(render, /Calendar progress/);
  assert.match(render, /PlanApp\.setProgressCalendar/);
});

test('calendar-specific history is calculated only from tasks in that view', () => {
  const sandbox = vm.createContext({Date, Set, dateKey:()=> '2026-10-01', scoreDay:(date,tasks)=>({date,count:tasks.length})});
  vm.runInContext(`${functionSource('progressHistory')}\nthis.progressHistory=progressHistory;`, sandbox);
  const tasks = [
    {date:'2026-09-01'},
    {date:'2026-09-01'},
    {date:'2026-09-02'}
  ];
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.progressHistory(tasks))), [
    {date:'2026-09-02',count:1},
    {date:'2026-09-01',count:2}
  ]);
});
