# Elecrow ESP Terminal 3.5-inch parallel (DLC35010R)

Experimental support for the **parallel** Terminal linked below. This is not the SPI Terminal (DLC35020S),
not a CrowPanel HMI resistive board, and not a continuously scanned RGB panel. Display, touch, colour order,
rotation, brightness and wake must still be checked on physical hardware before calling it supported on glass.

## Hardware and sources

- [Elecrow product](https://www.elecrow.com/esp-terminal-with-esp32-3-5-inch-parallel-480x320-tft-capacitive-touch-display-rgb-by-chip-ili9488.html)
- [Manufacturer wiki](https://static-cdn.elecrow.com/wiki/esp-terminal-with-35inch-rgb-capacitive-touch-display.html)
- [Manufacturer examples and schematic](https://github.com/Elecrow-RD/CrowPanel-ESP32-Terminal-with-3.5-inch-parallel-480x320-TFT-capacitive-touch-RGB-display)
  (`example/Arduino/ESP_Terminal_RGB_Arduino/ESP_Terminal_3.5inch_RGB_code/LVGL_RGB_/LVGL_RGB_.ino`,
  bundled LovyanGFX `Panel_ILI948x.hpp`, and `Eagle_SCH&PCB/RGB/ESP32- 3.5 TFT Display(RGB)-V2.0.sch`).

ESP32-S3-WROOM-1-N16R8: 16 MB flash, 8 MB octal PSRAM. ILI9488 native 320×480, landscape 480×320,
3.5 inches, 164.825 dpi. FT6236 capacitive touch at I2C address 0x38. The USB-C port uses a CH340C UART bridge.

| Signal | GPIO |
|---|---|
| LCD D0–D7, in order | 47, 21, 14, 13, 12, 11, 10, 9 |
| LCD D8–D15, in order | 3, 8, 16, 15, 7, 6, 5, 4 |
| WR / RD / DC | 18 / 48 / 45 |
| Backlight | 46, active high PWM |
| Touch SDA / SCL | 38 / 39 |
| Buzzer | 20 |
| USB bridge UART TX / RX | 43 / 44 |

CS is permanently selected and the LCD reset follows board reset; neither gets an invented GPIO.
RD is held high. No touch interrupt pin is assumed; the touch driver polls every 20 ms.

## Implementation

`packages/boards/elecrow-terminal-rgb.yaml` provides hardware and layout only. Shared Tessera cards, Home Assistant
API, OTA, touch filtering and rotation stay unchanged. The board starts at 2×2 cells in landscape and 1×3 in portrait,
with up to 128 tiles / 24 pages subject to the existing memory budget. It includes still camera pictures, self-test,
snapshot, standby and PWM dimming. Live video through direct RGB/DSI framebuffers is not available on this i80 panel.
The buzzer is an RTTTL output, not a media speaker or Assist device. SD and optional Crowtail peripherals are not configured.
No battery percentage is invented: the charging connector alone supplies no verified battery measurement.

The local external component `ili9488_i80` uses ESP-IDF's i80 DMA peripheral with the manufacturer's register values.
It reserves 10,240 bytes of internal DMA RAM, copies LVGL RGB565 pixels in bounded chunks, converts byte/colour order,
and waits for completion before reusing its buffer. A transfer error or one-second timeout stops the display instead
of corrupting an in-flight DMA buffer. Default bus speed is a conservative 10 MHz, configurable up to 20 MHz.
The driver remains in native portrait orientation; LVGL rotates display and touch together. MADCTL defaults to 0x08
(unmirrored native portrait, BGR). LVGL rotation 270 matches Elecrow's offset_rotation=2 plus rotation=1,
and maps touch to (479 - raw_y, raw_x), matching its example without an extra touch transform.
Actual colour/orientation acceptance is pending; `madctl` can be overridden if a board revision differs.

## Build locally

Use the ESPHome version in `requirements.txt`. Create `checkout/secrets.yaml` following `checkout/README.md`, then:

```sh
esphome config checkout/elecrow-terminal-rgb.yaml
esphome compile checkout/elecrow-terminal-rgb.yaml
```

Do not flash a build made with demonstration credentials. For an actual installation, let the customized Screen
Manager create the device's Wi-Fi/API configuration, or provide your own secrets before compiling.

## Install the customized app on Home Assistant OS

A local clone on your computer does not change Home Assistant's installed app. Publish your customized code in your
own public GitHub fork first. Keep it separate from upstream and do not install the unmodified upstream app expecting
it to know this board. See `INSTALL-ELECROW.md` in the delivered bundle for exact fork preparation and installation.
Both the add-on and its firmware package/component URLs must point to the same fork and branch.

## First hardware acceptance

1. Build using the real screen's configuration. Connect the Terminal's USB-C cable to the machine used for flashing;
   select its CH340 port by identity. If needed, hold BOOT while pressing RESET, then release BOOT.
2. Verify the boot log reports 16 MB flash, 8 MB PSRAM and the FT6236 at 0x38, without display setup/DMA failures.
3. Check solid red, green and blue, readable text and all four touch corners; drag a slider across the whole width.
4. Test landscape and portrait using Tessera's rotation setting. Confirm one touch triggers the expected tile.
5. Test brightness, standby and touch-to-wake; then OTA update and a cold power cycle.
6. Test a full layout, page swipes and still camera images; record free internal heap and responsiveness.

A successful compile is not hardware acceptance. Keep the board experimental until these checks pass.
