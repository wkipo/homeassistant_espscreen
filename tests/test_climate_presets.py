"""Climate preset attributes survive both initial and subsequent state messages."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'screen_manager/app'))
from core import state_message, packets, drawn_controls


def test_preset_attributes_follow_home_assistant():
    tile = {'entity': 'climate.room', 'name': ''}
    attrs = {'hvac_modes': ['heat', 'off'], 'preset_modes': ['eco', 'comfort', 'boost'],
             'preset_mode': 'comfort', 'supported_features': 401, 'temperature': 22}
    for state, preset in [('heat', 'comfort'), ('off', 'comfort'), ('heat', 'eco')]:
        message = state_message(0, tile, {'climate.room': {'state': state, 'attributes': {**attrs, 'preset_mode': preset}}})
        assert message['a']['preset_modes'] == attrs['preset_modes']
        assert message['a']['preset_mode'] == preset
        assert message['a']['hvac_modes'] == ['heat', 'off']
        assert len(packets(message)) <= 8


def test_absent_presets_are_not_invented():
    tile = {'entity': 'climate.room', 'name': ''}
    message = state_message(0, tile, {'climate.room': {'state': 'heat', 'attributes': {}}})
    assert 'preset_mode' not in message['a']
    assert 'preset_modes' not in message['a']


def test_new_tile_control_is_gated_by_firmware_capability():
    tile = {'entity': 'climate.room', 'name': '', 'options': {'size': 'square', 'controls': 'setpoint_preset'}}
    states = {'climate.room': {'state': 'heat', 'attributes': {'supported_features': 401,
              'temperature': 22, 'preset_modes': ['eco', 'comfort'], 'preset_mode': 'eco'}}}
    message = state_message(0, tile, states)
    assert drawn_controls(message, features=frozenset())['o']['controls'] == 'setpoint'
    message = state_message(0, tile, states)
    assert drawn_controls(message, features=frozenset({'climate_presets'}))['o']['controls'] == 'setpoint_preset'
