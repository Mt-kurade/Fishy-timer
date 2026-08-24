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

function loadStatsHelpers(context = {}) {
  const sandbox = vm.createContext({Date, Number, ...context});
  const names = [
    'lapDurationSeconds', 'sessionLapTotal', 'sessionTotalSeconds',
    'dayKey', 'dateToKey', 'dayTotalsMap', 'computePastWeekSeconds'
  ];
  vm.runInContext(`${names.map(functionSource).join('\n')}\nthis.api={${names.join(',')}};`, sandbox);
  return sandbox.api;
}

test('uses task durations when an old session summary is zero', () => {
  const api = loadStatsHelpers();
  const session = {total:0, laps:[{name:'cs', duration:29184}]};
  assert.equal(api.sessionTotalSeconds(session), 29184);
});

test('preserves a larger valid summary that includes unlapped historical time', () => {
  const api = loadStatsHelpers();
  const session = {total:600, laps:[{name:'saved task', duration:480}]};
  assert.equal(api.sessionTotalSeconds(session), 600);
});

test('daily stats include every task from duplicate same-day records', () => {
  const today = new Date();
  const key = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
  const records = [
    {date:today.toISOString(), total:0, laps:[{duration:120}]},
    {date:today.toISOString(), total:0, laps:[{duration:180}]}
  ];
  const api = loadStatsHelpers({getS:()=>records, todayKey:()=>key, todaySeconds:()=>0});
  assert.equal(api.dayTotalsMap()[key], 300);
});

test('past-seven-days total includes today and the previous six dates', () => {
  const records = [];
  for(let daysAgo=0;daysAgo<8;daysAgo++){
    const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()-daysAgo);
    records.push({date:date.toISOString(),total:0,laps:[{duration:60}]});
  }
  const today = new Date();
  const key = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
  const api = loadStatsHelpers({getS:()=>records, todayKey:()=>key, todaySeconds:()=>0});
  assert.equal(api.computePastWeekSeconds(), 7*60);
});
