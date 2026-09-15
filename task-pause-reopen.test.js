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

test('only a running task occupies the active timer slot', () => {
  assert.match(functionSource('reload'), /timer\?\.state==='running'/);
  assert.doesNotMatch(functionSource('reload'), /state==='paused'/);
  assert.match(functionSource('renderToday'), /timer\?\.state==='running'/);
});

test('starting or resuming another task pauses the running task first', () => {
  const start = functionSource('startTask');
  const resume = functionSource('resumeTask');
  assert.match(start, /x\.timer\?\.state==='running'/);
  assert.match(start, /pauseRunningTask\(other,at,'paused_for_task_switch'\)/);
  assert.match(resume, /pauseRunningTask\(other,at,'paused_for_task_switch'\)/);
});

test('paused tasks remain individually resumable from Today', () => {
  const row = functionSource('taskRow');
  assert.match(row, /timer\?\.state==='paused'/);
  assert.match(row, /PlanApp\.resumeTask/);
});

test('completed and partial results are editable only on their task day', () => {
  const sandbox = vm.createContext({STATUS:{DONE:'completed',PART:'partially-completed'}, dateKey:()=> '2026-09-15', Date});
  vm.runInContext(`${functionSource('isSameDayResult')}\nthis.isSameDayResult=isSameDayResult;`, sandbox);
  assert.equal(sandbox.isSameDayResult({date:'2026-09-15',status:'completed'}, '2026-09-15'), true);
  assert.equal(sandbox.isSameDayResult({date:'2026-09-15',status:'partially-completed'}, '2026-09-15'), true);
  assert.equal(sandbox.isSameDayResult({date:'2026-09-14',status:'completed'}, '2026-09-15'), false);
  assert.equal(sandbox.isSameDayResult({date:'2026-09-15',status:'in-progress'}, '2026-09-15'), false);
});

test('Today exposes edit and reopen actions and reopening preserves recorded time', () => {
  const row = functionSource('taskRow');
  const reopen = functionSource('reopenTask');
  assert.match(row, /PlanApp\.editRecord/);
  assert.match(row, /PlanApp\.reopenTask/);
  assert.match(reopen, /t\.timer\.state='paused'/);
  assert.match(reopen, /t\.status=STATUS\.RUN/);
  assert.doesNotMatch(reopen, /accumulated_seconds=0/);
  assert.match(reopen, /saveTask\(t,'reopened'/);
});
