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

test('dashboard includes only the active import and manual tasks', () => {
  const state = {tasks:[
    {id:'old',import_id:'old',history:[{type:'imported'}]},
    {id:'new',import_id:'new',history:[{type:'imported'}]},
    {id:'manual',import_id:null,history:[]},
    {id:'legacy-import',import_id:null,history:[{type:'imported'}]}
  ]};
  const sandbox = vm.createContext({state,activeImport:()=>({id:'new'}),taskBelongsToImport:(t,i)=>t.import_id===i.id});
  vm.runInContext(`${functionSource('visiblePlanTasks')}\nthis.visiblePlanTasks=visiblePlanTasks;`,sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.visiblePlanTasks().map(t=>t.id))),['new','manual']);
});

test('new imports become the active dashboard calendar', () => {
  const confirm = functionSource('confirmImport');
  assert.match(confirm, /setSetting\('active_import_id',importId\)/);
});

test('Today, Calendar, and Import expose active-calendar controls', () => {
  assert.match(functionSource('renderToday'), /activeCalendarControl\(\)/);
  assert.match(functionSource('renderCalendar'), /activeCalendarControl\(\)/);
  assert.match(functionSource('renderImport'), /Use on dashboard/);
  assert.match(source, /setActiveCalendar,setProgressCalendar/);
});

