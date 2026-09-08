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

const sandbox = vm.createContext({Number, Math, String});
vm.runInContext(`${functionSource('plannedEndTime')}\nthis.plannedEndTime=plannedEndTime;`, sandbox);

test('calculates the scheduled end time from start and duration', () => {
  assert.equal(sandbox.plannedEndTime('09:30', 90), '11:00');
  assert.equal(sandbox.plannedEndTime('23:30', 60), '00:30');
  assert.equal(sandbox.plannedEndTime('', 60), null);
});

test('dashboard and calendar expose manual task scheduling', () => {
  assert.match(functionSource('renderToday'), /PlanApp\.scheduleTask/);
  assert.match(functionSource('renderCalendar'), /PlanApp\.scheduleTask/);
});

test('scheduler captures the required task fields', () => {
  const modal = functionSource('scheduleTask');
  for (const id of ['schedule-date','schedule-start','schedule-subject','schedule-duration','schedule-topic','schedule-type']) {
    assert.match(modal, new RegExp(id));
  }
});

test('scheduled task uses the standard dashboard task model', () => {
  const confirm = functionSource('confirmScheduleTask');
  assert.match(confirm, /manually_scheduled:true/);
  assert.match(confirm, /timer:\{state:'idle'/);
  assert.match(confirm, /type:'manually_scheduled'/);
  assert.match(confirm, /await put\('tasks',task\)/);
  assert.match(confirm, /await reload\(\)/);
  assert.match(confirm, /queueGoogleSync\(\)/);
});
