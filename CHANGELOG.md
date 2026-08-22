# Changelog

All notable changes to the openHASP Page Editor extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.5] - 2026-08-22

### Added

- Long-press actions for Home Assistant bindings — a push button bound to a `light`, `switch`,
  `input_boolean`, or `fan` entity now offers "Toggle (long press)", firing on openHASP's `long`
  event so a short press and a long press can do different things. Toggle buttons and sliders
  don't emit `long`, so the option stays hidden for them, and an existing `long` binding now
  displays its curated action name instead of "Custom…".

### Fixed

- Action summaries for the `release` trigger now read "Releasing the widget …" instead of falling
  back to the raw `On "release" …` text.

## [0.1.0]

Initial release.

### Added

- Visual drag-and-drop page editor for openHASP designs, opened as a custom editor for
  `.jsonl`, `.hasp`, and `.hasp.json` files.
- Widget palette covering 40+ openHASP widgets — containers, controls, and visualization.
- Property inspector with widget-specific property sections.
- Multi-page management and canvas preview at the configured device resolution.
- Rich `.hasp.json` design format, with JSONL import and export for device deployment.
- openHASP explorer view in the activity bar for browsing design files.
- Upload to device over MQTT.
- Home Assistant integration: entity lookup, widget bindings, live preview, and
  generation of Home Assistant configuration from a design file.
- Custom icon font and LittleFS image root settings so the canvas renders device
  glyphs and LVGL `.bin` images.

[Unreleased]: https://github.com/prasen12/openhasp-editor/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/prasen12/openhasp-editor/compare/v0.1.4...v0.1.5
[0.1.0]: https://github.com/prasen12/openhasp-editor/releases/tag/v0.1.0
