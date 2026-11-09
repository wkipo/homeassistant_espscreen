import { describe, it, expect } from 'vitest';
import { presetBarKeys } from '../src/model/tall-controls';
import { drawable, resolveControls } from '../src/model/catalogue';
import { drawnControls } from '../src/model/tile-face';
const a = { supported_features: 401, hvac_modes: ['heat', 'off'], preset_modes: ['boost', 'comfort', 'eco'] };
describe('climate preset tile controls', () => {
  it('offers Eco Comfort Off in order and keeps overflow reachable', () => {
    expect(presetBarKeys(a).map(k => k.mode)).toEqual(['eco', 'comfort', 'off']);
    expect(presetBarKeys(a, 2).map(k => k.mode)).toEqual(['eco', undefined]);
    expect(presetBarKeys({...a, preset_modes: ['boost']})).toEqual([]);
    expect(presetBarKeys({...a, supported_features: 385})).toEqual([]);
  });
  it('keeps temperature controls on older screens and one-row tiles', () => {
    expect(drawable('climate', 'setpoint_preset', a, new Set())).toBe('setpoint');
    expect(drawable('climate', 'setpoint_preset', a, new Set(['climate_presets']))).toBe('setpoint_preset');
    expect(resolveControls({entity: 'climate.room', options: {size: 'wide', controls: 'setpoint_preset'}})).toBe('setpoint');
    expect(resolveControls({entity: 'climate.room', options: {size: 'square', controls: 'setpoint_preset'}})).toBe('setpoint_preset');
    expect(drawnControls('climate', 'setpoint_preset', {a, state: 'heat'}, 1, true)).toBe('setpoint');
  });
});
