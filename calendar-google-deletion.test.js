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

test('calendar deletion waits for sync and removes every imported task locally', () => {
  const remove = functionSource('deleteImport');
  assert.match(remove, /googleSync\.deleting=true/);
  assert.match(remove, /waitForGoogleSyncIdle\(\)/);
  assert.match(remove, /state\.tasks\.filter\(t=>t\.import_id===id\)/);
  assert.match(remove, /del\('tasks',t\.id\)/);
  assert.match(remove, /del\('imports',id\)/);
  assert.match(remove, /rebuildPastScores/);
  assert.match(remove, /renderCurrent\(\)/);
});

test('Google deletion is queued by Fishyy task ID even without a saved event ID', () => {
  const queue = functionSource('queueGoogleDeletion');
  assert.match(queue, /task_id:taskId/);
  assert.match(queue, /event_id:eventId\|\|null/);
  assert.doesNotMatch(queue, /if\(!eventId\)return/);
});

test('queued deletions find orphaned Google events by Fishyy task ID', () => {
  const flush = functionSource('flushGoogleDeletions');
  assert.match(flush, /fishyTaskId===item\.task_id/);
  assert.match(flush, /method:'DELETE'/);
  assert.match(flush, /remaining\.push\(item\)/);
  assert.match(flush, /setSetting\('google_pending_deletes',remaining\)/);
});

test('connected calendar deletion flushes Google removals immediately', () => {
  const remove = functionSource('deleteImport');
  assert.match(remove, /googleConnected\(\)/);
  assert.match(remove, /await flushGoogleDeletions\(\)/);
  assert.match(remove, /deleted from Fishyy and Google Calendar/);
});

