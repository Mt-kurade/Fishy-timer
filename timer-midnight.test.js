const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('./index.html', `file://${__filename.replace(/\\/g, '/')}`), 'utf8');

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

function loadRollover(context = {}) {
  const sandbox = vm.createContext({Date, ...context});
  const names = [
    'wallDayKey', 'nextLocalMidnight', 'midnightBoundariesBetween',
    'timerValueAt', 'splitActiveRunAtMidnight'
  ];
  vm.runInContext(`${names.map(functionSource).join('\n')}\nthis.api={${names.join(',')}};`, sandbox);
  return sandbox.api;
}

function loadRestoreHelpers(saved) {
  const localStorage = {
    getItem:key => key === 'study_autosave' ? JSON.stringify(saved) : null,
    removeItem:()=>{}
  };
  const sandbox = vm.createContext({Date, JSON, localStorage, AUTOSAVE_KEY:'study_autosave'});
  const names = ['todayStr', 'loadAutosave'];
  vm.runInContext(`${names.map(functionSource).join('\n')}\nthis.api={${names.join(',')}};`, sandbox);
  return sandbox.api;
}

test('finds the exact local-midnight boundary in a four-second run', () => {
  const api = loadRollover();
  const start = new Date(2026, 7, 24, 23, 59, 58).getTime();
  const end = new Date(2026, 7, 25, 0, 0, 2).getTime();
  const boundaries = api.midnightBoundariesBetween(start, end);
  assert.equal(boundaries.length, 1);
  const midnight = new Date(boundaries[0]);
  assert.deepEqual(
    [midnight.getFullYear(), midnight.getMonth(), midnight.getDate(), midnight.getHours(), midnight.getMinutes(), midnight.getSeconds()],
    [2026, 7, 25, 0, 0, 0]
  );
});

test('closes the previous day and pauses at 00:00 without opening a new run', () => {
  const start = new Date(2026, 7, 24, 23, 59, 58).getTime();
  const end = new Date(2026, 7, 25, 0, 0, 2).getTime();
  const saved = [];
  const synced = [];
  const S = {run:true, calRunStartWall:start, startedAt:start, sessionStartWall:start, t:0, ls:0, laps:[], mode:'stopwatch'};
  const api = loadRollover({
    S,
    iv:null,
    AUTOSAVE_KEY:'study_autosave',
    currentLapName:'study block',
    currentCalColorSeed:3,
    saveCalSegment:(segment, key) => saved.push({segment, key}),
    syncSessionDayFromCalendar:key => synced.push(key),
    clearInterval:()=>{}, stopCalLive:()=>{}, relWL:()=>{}, updClock:()=>{},
    pushBowlState:()=>{}, refreshTracker:()=>{}, todayStr:()=> '2026-8-25',
    localStorage:{setItem:()=>{}},
    document:{getElementById:id => id === 'sbtn' ? {textContent:''} : {disabled:false}}
  });

  api.splitActiveRunAtMidnight(end);

  assert.equal(saved.length, 1);
  assert.equal(saved[0].segment.type, 'pause');
  assert.equal(saved[0].key, '2026-8-24');
  assert.deepEqual(synced, ['2026-8-24']);
  assert.equal(S.calRunStartWall, null);
  assert.equal(S.run, false);
  assert.equal(S.t, 0);
});

test('splits every crossed day after a sleeping tab wakes up', () => {
  const api = loadRollover();
  const start = new Date(2026, 7, 24, 23, 59, 58).getTime();
  const end = new Date(2026, 7, 27, 0, 0, 2).getTime();
  assert.equal(api.midnightBoundariesBetween(start, end).length, 3);
});

test('does not count time elapsed while the webpage was closed', () => {
  const now = new Date();
  const date = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  const api = loadRestoreHelpers({
    date,
    t:120,
    mode:'stopwatch',
    wasRunning:true,
    savedAtWall:Date.now()-60*60*1000
  });
  assert.equal(api.loadAutosave().t, 120);
});
