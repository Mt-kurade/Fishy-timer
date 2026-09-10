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

const sandbox = vm.createContext({Date, Math, Number, STATUS:{SKIP:'skipped'}, completionOf:t=>t.completion, plannedMinutes:t=>t.planned, focusedSeconds:t=>t.focused});
vm.runInContext(`${functionSource('todayFinishEstimate')}\nthis.todayFinishEstimate=todayFinishEstimate;`, sandbox);

test('finish estimate includes only unfinished task time still to focus', () => {
  const tasks = [
    {planned:60, focused:15*60, completion:0},
    {planned:30, focused:10*60, completion:100},
    {planned:45, focused:0, completion:0, status:'skipped'},
    {planned:90, focused:30*60, completion:25}
  ];
  const now = new Date('2026-09-10T10:00:00').getTime();
  const estimate = sandbox.todayFinishEstimate(tasks, now);
  assert.equal(estimate.remainingSeconds, 105*60);
  assert.equal(estimate.finishesAt.getTime(), new Date('2026-09-10T11:45:00').getTime());
});

test('Today dashboard displays and refreshes the expected finish section', () => {
  assert.match(functionSource('renderToday'), /If you start now, expected finish/);
  assert.match(source, /setInterval\(\(\)=>\{refreshFinishEstimate\(\)/);
});
