const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

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

test('every task exposes a delete action in its details', () => {
  const details = functionSource('taskDetails');
  assert.match(details, /PlanApp\.deleteTask/);
  assert.match(details, /Delete task/);
});

test('deleting a task removes linked data and refreshes past progress', () => {
  const remove = functionSource('deleteTask');
  assert.match(remove, /queueGoogleDeletion\(t\)/);
  assert.match(remove, /del\('tasks',id\)/);
  assert.match(remove, /put\('dailyScores',score\)/);
  assert.match(remove, /del\('dailyScores',t\.date\)/);
  assert.match(remove, /imp\.row_count=/);
  assert.match(remove, /queueGoogleSync\(\)/);
});

