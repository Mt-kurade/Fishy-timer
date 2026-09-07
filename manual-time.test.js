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

const sandbox = vm.createContext({Number});
vm.runInContext(`${functionSource('manualTimeSeconds')}\n${functionSource('correctionTimeSeconds')}\n${functionSource('correctedFocusedSeconds')}\nthis.api={manualTimeSeconds,correctionTimeSeconds,correctedFocusedSeconds};`, sandbox);
const {manualTimeSeconds,correctionTimeSeconds,correctedFocusedSeconds}=sandbox.api;

test('converts manually entered hours and minutes to focused seconds', () => {
  assert.equal(manualTimeSeconds(1, 30), 90 * 60);
});

test('rejects empty, invalid, and over-one-day adjustments', () => {
  assert.equal(manualTimeSeconds(0, 0), 0);
  assert.equal(manualTimeSeconds(0, 60), 0);
  assert.equal(manualTimeSeconds(24, 1), 0);
});

test('recorded task time can be set exactly or reduced by an amount', () => {
  assert.equal(correctionTimeSeconds(0,40), 40*60);
  assert.equal(correctedFocusedSeconds(639*60+5,'set',40*60), 40*60);
  assert.equal(correctedFocusedSeconds(100*60,'subtract',60*60), 40*60);
  assert.equal(correctedFocusedSeconds(20*60,'subtract',60*60), 0);
});

test('time correction rejects invalid hour and minute inputs', () => {
  assert.equal(correctionTimeSeconds(1,60), null);
  assert.equal(correctionTimeSeconds(-1,30), null);
  assert.equal(correctionTimeSeconds(1.5,0), null);
});

test('active and listed tasks expose the recorded-time correction', () => {
  assert.match(functionSource('taskRow'), /PlanApp\.correctRecordedTime/);
  assert.match(functionSource('activeMarkup'), /PlanApp\.correctRecordedTime/);
  assert.match(functionSource('taskDetails'), /PlanApp\.correctRecordedTime/);
});

test('correcting a running task preserves continuity and writes an audit event', () => {
  const confirm = functionSource('confirmRecordedTimeCorrection');
  assert.match(confirm, /if\(wasRunning\)closeRunningSegment\(t,at\)/);
  assert.match(confirm, /if\(wasRunning\)openSegment\(t,at\)/);
  assert.match(confirm, /focused_time_correction/);
  assert.match(confirm, /before_seconds:before/);
  assert.match(confirm, /after_seconds:after/);
});

test('Today task controls expose the worked-time adjustment', () => {
  assert.match(functionSource('taskRow'), /PlanApp\.addWorkedTime/);
  assert.match(functionSource('activeMarkup'), /PlanApp\.addWorkedTime/);
});

test('confirmed worked time is copied into the shared daily tracker', () => {
  assert.match(functionSource('confirmWorkedTime'), /saveManualWorkedTime\(t\.date,seconds/);
  assert.match(functionSource('buildCalEvents'), /s\.type === 'manual'/);
  assert.match(functionSource('calDayTotalFromSegments'), /ev\.committed/);
});

test('normal timer can only be started from the Start Timer button', () => {
  assert.match(source, /id="sbtn" onclick="toggleTimer\(\)"[^>]*>\[ start timer \]/);
  assert.doesNotMatch(source, /case ' ':e\.preventDefault\(\);toggleTimer\(\)/);
  assert.match(source, /let lastCmdTs = \(\(\)=>\{/);
  assert.match(source, /localStorage\.getItem\(CMD_KEY\)/);
});
