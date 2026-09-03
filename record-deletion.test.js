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

test('deleting a history block asks for permanent-deletion confirmation', () => {
  assert.match(functionSource('editDeleteLap'), /confirm\(`/);
  assert.match(functionSource('editDeleteLap'), /calendar entry and time in your daily goal and stats/);
});

test('saving edited records rebuilds the calendar source of truth', () => {
  assert.match(functionSource('saveEditModal'), /replaceCalendarDayFromEditedLaps\(key, editLaps\)/);
  assert.match(functionSource('saveEditModal'), /syncSessionDayFromCalendar\(key\)/);
});

test('removed blocks are absent from persisted calendar segments', () => {
  const key = '2026-9-3';
  const stored = {
    fishy_cal: JSON.stringify({
      [key]: [
        {type:'start', wall:1000, lapName:'keep'},
        {type:'lap', wall:11000, name:'keep'},
        {type:'start', wall:20000, lapName:'delete me'},
        {type:'lap', wall:30000, name:'delete me'}
      ]
    })
  };
  const localStorage = {
    getItem:name => stored[name] ?? null,
    setItem:(name, value) => { stored[name] = value; }
  };
  const sandbox = vm.createContext({
    JSON, Number, localStorage, CAL_KEY:'fishy_cal', CAL_COLORS:new Array(12).fill({}),
    S:{run:false}, todayKey:()=>key
  });
  vm.runInContext(`${functionSource('replaceCalendarDayFromEditedLaps')}\nthis.replace=replaceCalendarDayFromEditedLaps;`, sandbox);

  sandbox.replace(key, [{
    name:'keep', duration:10, ci:2, wallStart:1000, wallEnd:11000, calendarType:'run'
  }]);

  const segments = JSON.parse(stored.fishy_cal)[key];
  assert.deepEqual(segments.map(segment => segment.type), ['start', 'lap']);
  assert.equal(segments.some(segment => segment.name === 'delete me' || segment.lapName === 'delete me'), false);
});

test('clearing a calendar day also reconciles history and stats', () => {
  const clearDay = functionSource('clearCalDay');
  assert.match(clearDay, /syncSessionDayFromCalendar\(key\)/);
  assert.match(clearDay, /refreshTracker\(\)/);
});
