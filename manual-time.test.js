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
vm.runInContext(`${functionSource('manualTimeSeconds')}\nthis.manualTimeSeconds=manualTimeSeconds;`, sandbox);

test('converts manually entered hours and minutes to focused seconds', () => {
  assert.equal(sandbox.manualTimeSeconds(1, 30), 90 * 60);
});

test('rejects empty, invalid, and over-one-day adjustments', () => {
  assert.equal(sandbox.manualTimeSeconds(0, 0), 0);
  assert.equal(sandbox.manualTimeSeconds(0, 60), 0);
  assert.equal(sandbox.manualTimeSeconds(24, 1), 0);
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
