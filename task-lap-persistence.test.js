const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('index.html', 'utf8');
const popupSource = fs.readFileSync('bowl-popup.html', 'utf8');

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

function loadCalendarModel() {
  const stored = {};
  const localStorage = {
    getItem:key => stored[key] ?? null,
    setItem:(key, value) => { stored[key] = value; }
  };
  const sandbox = vm.createContext({
    Date, JSON, Number, Math, localStorage, CAL_KEY:'fishy_cal',
    CAL_COLORS:new Array(12).fill({}), LC:new Array(8).fill('#aaa'),
    S:{run:false, ls:0, t:0}, getCurrentT:()=>0, renderSess:()=>{}
  });
  const names = ['loadCalDay', 'buildCalEvents', 'getS', 'dayKey', 'dayKeyDate', 'syncSessionDayFromCalendar'];
  vm.runInContext(`${names.map(functionSource).join('\n')}\nthis.api={${names.join(',')}};`, sandbox);
  return {api:sandbox.api, stored};
}

test('pausing an unlapped task does not create a study block', () => {
  const {api} = loadCalendarModel();
  const events = api.buildCalEvents([
    {type:'start', wall:1000, lapName:'study block', colorSeed:2},
    {type:'pause', wall:13000}
  ]);
  assert.equal(events.length, 0);
});

test('pause and resume periods become one block only after lap', () => {
  const {api, stored} = loadCalendarModel();
  const key = '2026-9-3';
  stored.fishy_cal = JSON.stringify({[key]:[
    {type:'start', wall:1000, lapName:'study block', colorSeed:2},
    {type:'pause', wall:13000},
    {type:'start', wall:20000, lapName:'study block', colorSeed:2},
    {type:'lap', wall:28000, name:'Biology'}
  ]});

  api.syncSessionDayFromCalendar(key);

  const sessions = JSON.parse(stored.study_s);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].laps.length, 1);
  assert.equal(sessions[0].laps[0].name, 'Biology');
  assert.equal(sessions[0].laps[0].duration, 20);
  assert.equal(sessions[0].laps[0].wallRuns.length, 2);
});

test('lap action immediately syncs the committed task', () => {
  assert.match(functionSource('saveLap'), /saveCalSegment\(\{type:'lap'[\s\S]*syncSessionDayFromCalendar/);
});

test('a lap saves manually added stopwatch time, not only wall-clock time', () => {
  const {api, stored} = loadCalendarModel();
  const key = '2026-9-3';
  stored.fishy_cal = JSON.stringify({[key]:[
    {type:'start', wall:61000, lapName:'study block', colorSeed:2},
    // Ten real seconds plus one manually added minute equals 70 seconds.
    {type:'lap', wall:71000, name:'Chemistry', duration:70}
  ]});

  api.syncSessionDayFromCalendar(key);

  const lap = JSON.parse(stored.study_s)[0].laps[0];
  assert.equal(lap.duration, 70);
  assert.equal(lap.wallEnd-lap.wallStart, 70000);
});

test('normal and pop-out lap events persist their displayed duration', () => {
  assert.match(functionSource('saveLap'), /type:'lap'[\s\S]*duration:completedLap\.duration/);
  assert.match(functionSource('processCmd'), /type:'lap'[\s\S]*duration:p\.duration/);
});

test('stopwatch lap duration equals the value displayed on the timer', () => {
  const sandbox = vm.createContext({Number, Math, S:{mode:'stopwatch', ls:4148}});
  vm.runInContext(`${functionSource('lapTiming')}\nthis.lapTiming=lapTiming;`, sandbox);
  const timing = sandbox.lapTiming(4159, 'stopwatch', 4148);
  assert.equal(timing.start, 0);
  assert.equal(timing.end, 4159);
  assert.equal(timing.duration, 4159);
});

test('saving a stopwatch lap resets the next block to zero', () => {
  const save = functionSource('saveLap');
  assert.match(save, /S\.mode === 'stopwatch'/);
  assert.match(save, /S\.t=0; S\.ls=0/);
  assert.match(save, /updClock\(\)/);
});

test('both pop-out timer variants show the full stopwatch value in the lap modal', () => {
  assert.match(source, /const start=st\.mode==='stopwatch'\?0:st\.ls;const dur=now-start/);
  assert.match(popupSource, /const start = st\.mode === 'stopwatch' \? 0 : st\.ls;/);
});
