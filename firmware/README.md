# Firmware

This directory contains firmware code for the digital bus-stop display.

## Boot & Configuration

On first boot the board starts a Wi-Fi access point named `BusStopSetup` and
hosts a small configuration page. The page collects:

- Wi-Fi SSID and password
- `Stop ID` corresponding to `/arrivals/:stopId` in the backend

After submitting the form the configuration is saved to `config.json` in the
board's flash storage. Pressing the hardware setup button or removing the
configuration file will relaunch the setup portal to allow reconfiguration.

## Networking & Sync

After configuration the board connects to the specified Wi-Fi network and
polls the backend for data:

- Every 30 seconds it requests `/arrivals/<stopId>` to obtain upcoming buses.
- Every 60 seconds it requests `/alerts` for service notices.

Fetched JSON is printed to the serial console for now and will later drive the
physical display.

If the network goes down the last known data is shown with a "Data unavailable"
message while the firmware backs off exponentially before retrying.

## Display Logic

The prototype includes a simple display driver that:

- Shows the stop name and current time in the header.
- Lists the next three arrivals with their estimated time in minutes.
- Rotates through active alerts like a ticker.
- Adjusts brightness based on an ambient light sensor when available.

Actual screen drawing is stubbed with console output so the behaviour can be
tested without hardware.

## OTA Updates & Security

On boot the firmware checks `/firmware/latest` for a version newer than its own.
The update routine is currently a placeholder that would download and apply a
signed firmware package in a production build. Responses are validated to be
JSON before use and HTTP failures trigger capped exponential backoff to avoid
overloading the backend.
