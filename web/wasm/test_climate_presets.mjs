// Actual firmware decoder, tile keys and Home Assistant actions on the Elecrow layout.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import createModule from '../src/wasm/firmware_preview.js';
import { connection, configure } from './test_protocol.mjs';
const wasmBinary = readFileSync(new URL('../src/wasm/firmware_preview.wasm', import.meta.url));
const m = await createModule({wasmBinary});
assert.equal(m._preview_init(480, 320, 165, 3, 2), 1);
const receive = connection(m);
const tile = {entity: 'climate.room', name: 'Room', state: 'off', slot: 0,
  o: {size: 'square', controls: 'setpoint_preset'}, a: {supported_features: 401,
  hvac_modes: ['heat', 'off'], preset_modes: ['eco', 'comfort', 'boost'], preset_mode: 'comfort',
  temperature: 22, current_temperature: 22.5, min_temp: 8, max_temp: 28, target_temp_step: 0.5}};
configure(receive, 'Room', 1, [tile]);
let ms = 0;
const tick = (n = 6) => {for (let i = 0; i < n; i++) {ms += 32; m._preview_time(ms, 1789401840, 7200); m._preview_render();}};
const objects = () => JSON.parse(m.ccall('preview_layout', 'string', [], [])).objects;
const next = () => {const s = m.ccall('preview_next_action', 'string', [], []); return s ? JSON.parse(s) : null;};
const tap = (text) => {
  const label = objects().findLast(o => o.type === 'label' && o.text === text);
  assert.ok(label, `visible key ${text}`);
  const x = (label.x1 + label.x2) / 2, y = (label.y1 + label.y2) / 2;
  assert.ok(x >= 0 && x < 480 && y >= 0 && y < 320, `key ${text} inside display`);
  m._preview_touch(x, y, 1); tick(2); m._preview_touch(x, y, 0); tick(10);
};
tick(12);
tap('\u{F032A}'); // Eco directly on the tile
let a = next();
assert.equal(a?.service, 'climate.set_hvac_mode');
assert.deepEqual(a.data, {entity_id: 'climate.room', hvac_mode: 'heat'});
const heatCall = a.call_id;
assert.equal(next(), null, 'preset waits for actual heating state');
receive({op: 'state', i: 0, entity: tile.entity, name: tile.name, state: 'heat', a: tile.a}); tick();
a = next();
assert.equal(a?.service, 'climate.set_preset_mode');
assert.equal(a.data.preset_mode, 'eco');
// A late reply to the heating request is distinct from the newer preset action.
m.ccall('preview_action_response', null, ['number', 'number', 'string'], [heatCall, 1, '']); tick();
receive({op: 'state', i: 0, entity: tile.entity, name: tile.name, state: 'heat', a: {...tile.a, preset_mode: 'eco'}}); tick(10);
tap('\u{F04B9}'); // Comfort
assert.equal(next()?.data.preset_mode, 'comfort');
receive({op: 'state', i: 0, entity: tile.entity, name: tile.name, state: 'heat', a: tile.a}); tick(10);
tap('\u{F0425}');
a = next();
assert.equal(a?.service, 'climate.set_hvac_mode'); assert.equal(a.data.hvac_mode, 'off');
console.log('PASS Elecrow climate preset tile: Eco resumes heat then applies preset; Comfort and Off send the correct actions');
