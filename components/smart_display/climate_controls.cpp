// Climate choices live in a separate object: keeping this vector/string code in main.cpp
// exceeded Xtensa's literal reach on ESP32-S3 (l32r relocation at link time).
#include "tile_controls.h"
namespace tile_controls {
ClimateRow climate_preset_row(const Tile &t) {
  const auto &x = t.extra();
  // Heating shortcuts: only the presets the entity advertises, with Off as an HVAC mode.
  // Requiring heat keeps waking a cooling-only device out of these heating shortcuts.
  const auto hvac = list_values(x.hvac_modes, 8);
  const auto presets = list_values(x.preset_modes, 32);
  auto has = [](const auto &values, const char *v) { return std::find(values.begin(), values.end(), v) != values.end(); };
  if (t.domain() == "climate" && (t.supported & tile_catalogue::climate::PRESET_MODE) && has(hvac, "heat")) {
    ClimateRow out;
    out.kind = 'p';
    out.icon = climate_mode_icon("heat");
    for (const auto *value : {"eco", "comfort"}) if (has(presets, value)) {
      out.values.emplace_back(value);
      out.labels.push_back(humidifier_mode_text(value));
    }
    if (!out.values.empty()) {
      if (has(hvac, "off")) { out.values.emplace_back("off"); out.labels.push_back(climate_mode_text("off")); }
      out.current = !t.available() ? "" : t.state == "off" ? "off" : x.preset_mode;
      return out;
    }
  }
  return {};
}
std::vector<ClimateRow> climate_rows(const Tile &t) {
  std::vector<ClimateRow> rows;
  const auto &x = t.extra();
  if (humidifier(t)) {
    if (humidifier_named_modes(t)) return rows;
    auto values = list_values(x.hvac_modes, 6);
    if (values.size() < 2) return rows;
    ClimateRow out;
    out.kind = 'm';
    out.icon = "\U000F058E";   // water-percent: the row is the humidifier's, whichever mode it is in
    out.current = x.humidifier_mode;
    for (const auto &value : values) out.labels.push_back(humidifier_mode_text(value));
    out.values = std::move(values);
    rows.push_back(std::move(out));
    return rows;
  }
  auto preset = climate_preset_row(t);
  if (!preset.values.empty()) rows.push_back(std::move(preset));
  const struct { char kind; const char *icon; const std::string &modes; const std::string &current; } wanted[] = {
      {'f', glyph::FAN, x.fan_modes, x.fan_mode},
      {'s', "\U000F1C91", x.swing_modes, x.swing_mode},
  };
  for (const auto &row : wanted) {
    auto values = list_values(row.modes, 6);
    if (values.empty()) continue;
    ClimateRow out;
    out.kind = row.kind;
    out.icon = row.icon;
    out.current = row.current;
    for (const auto &value : values) out.labels.push_back(climate_setting_text(row.kind, value));
    out.values = std::move(values);
    rows.push_back(std::move(out));
  }
  return rows;
}
}  // namespace tile_controls
