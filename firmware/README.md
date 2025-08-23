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
