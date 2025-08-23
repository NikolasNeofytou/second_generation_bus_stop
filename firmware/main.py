import json
import network
import socket
import machine
import os
import time

try:
    import urequests as requests
except ImportError:  # pragma: no cover - for local testing outside MicroPython
    import requests  # type: ignore

CONFIG_FILE = "config.json"
AP_SSID = "BusStopSetup"
AP_PASSWORD = "config123"
API_BASE = "http://localhost:3000"
FIRMWARE_VERSION = "0.1.0"


class Display:
    """Simple placeholder display driver.

    In a real deployment this would interface with the actual screen. For
    now it prints lines to the serial console so the logic can be verified
    without hardware.
    """

    def __init__(self, stop_id: str, stop_name: str = ""):
        self.stop_id = stop_id
        self.stop_name = stop_name or ("Stop %s" % stop_id)
        self.alerts = []
        self._alert_index = 0
        # Attempt to initialise an ambient light sensor for brightness control
        try:
            self._light = machine.ADC(machine.Pin(34))
        except Exception:  # pragma: no cover - hardware specific
            self._light = None

    def set_alerts(self, alerts: list) -> None:
        self.alerts = alerts or []
        self._alert_index = 0

    def _brightness(self) -> int:
        if not self._light:
            return 255
        try:
            # Scale ADC reading (0-1023) to 0-255 range
            return int(self._light.read() / 4)
        except Exception:  # pragma: no cover - hardware specific
            return 255

    def render(self, arrivals: list, offline: bool = False) -> None:
        """Render header, arrivals and a rotating alert."""

        brightness = self._brightness()
        now = time.localtime()
        header = "%s %02d:%02d" % (self.stop_name, now[3], now[4])
        print("\nBRIGHTNESS", brightness)
        print(header)

        if offline:
            print("Data unavailable")
        elif arrivals:
            for a in arrivals[:3]:
                eta = int(a.get("etaMinutes", 0))
                route = a.get("route", a.get("vehicleId", "?"))
                print("%s %d min" % (route, eta))
        else:
            print("No upcoming arrivals")

        if self.alerts:
            alert = self.alerts[self._alert_index % len(self.alerts)]
            msg = alert.get("header") or alert.get("description") or ""
            print("ALERT:", msg)
            self._alert_index += 1


def load_config() -> dict:
    if CONFIG_FILE in os.listdir():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}


def save_config(data: dict) -> None:
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f)


def start_config_portal() -> dict:
    ap = network.WLAN(network.AP_IF)
    ap.config(essid=AP_SSID, password=AP_PASSWORD)
    ap.active(True)

    addr = socket.getaddrinfo("0.0.0.0", 80)[0][-1]
    s = socket.socket()
    s.bind(addr)
    s.listen(1)

    html_form = """
        <html><body>
        <h1>Bus Stop Setup</h1>
        <form action='/save' method='get'>
        SSID: <input name='ssid'/><br/>
        Password: <input name='password' type='password'/><br/>
        Stop ID: <input name='stop'/><br/>
        <input type='submit' value='Save'/>
        </form>
        </body></html>
    """

    config = {}
    while True:
        cl, _ = s.accept()
        request = cl.recv(1024)
        request_str = request.decode()
        if "GET /save" in request_str:
            _, params = request_str.split("?", 1)
            params = params.split(" ")[0]
            entries = {k: v for k, v in (p.split("=") for p in params.split("&"))}
            config = {
                "ssid": entries.get("ssid", ""),
                "password": entries.get("password", ""),
                "stop_id": entries.get("stop", ""),
            }
            save_config(config)
            cl.send("HTTP/1.0 200 OK\r\n\r\nSaved. Rebooting...")
            cl.close()
            break
        else:
            cl.send("HTTP/1.0 200 OK\r\n\r\n" + html_form)
            cl.close()

    s.close()
    ap.active(False)
    return config


def needs_setup(button_pin: int = 0) -> bool:
    button = machine.Pin(button_pin, machine.Pin.IN, machine.Pin.PULL_UP)
    return button.value() == 0 or CONFIG_FILE not in os.listdir()


def connect_wifi(ssid: str, password: str, timeout: int = 15) -> bool:
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(ssid, password)
    for _ in range(timeout * 2):
        if wlan.isconnected():
            return True
        time.sleep(0.5)
    return False


def fetch_json(url: str):
    try:
        res = requests.get(url)
        if (
            res.status_code == 200
            and 'application/json' in res.headers.get('Content-Type', '')
        ):
            data = res.json()
            res.close()
            return data
        res.close()
    except Exception as e:  # pragma: no cover - debug output only
        print("request failed", e)
    return None


def fetch_stop_name(stop_id: str) -> str:
    stops = fetch_json("%s/stops" % API_BASE)
    if stops:
        for s in stops:
            if s.get("stop_id") == stop_id:
                return s.get("stop_name", stop_id)
    return "Stop %s" % stop_id


def check_for_update() -> None:
    info = fetch_json("%s/firmware/latest" % API_BASE)
    if info and info.get("version") != FIRMWARE_VERSION:
        print("update available", info.get("version"))
        url = info.get("url")
        if url:
            print("would download", url)


def sync_loop(cfg: dict) -> None:
    stop_id = cfg.get("stop_id")
    stop_name = fetch_stop_name(stop_id)
    display = Display(stop_id, stop_name)
    last_alert = 0
    cached_alerts: list = []
    cached_arrivals: list = []
    failures = 0
    last_update = 0
    while True:
        arrivals = fetch_json("%s/arrivals/%s" % (API_BASE, stop_id))
        offline = False
        if arrivals is None:
            offline = True
            arrivals = cached_arrivals
            failures += 1
        else:
            cached_arrivals = arrivals
            failures = 0

        display.render(arrivals or [], offline=offline)

        if time.time() - last_alert >= 60:
            alerts = fetch_json("%s/alerts" % API_BASE)
            if alerts is not None:
                cached_alerts = alerts
                display.set_alerts(cached_alerts)
            last_alert = time.time()

        if time.time() - last_update >= 3600:
            check_for_update()
            last_update = time.time()

        delay = min(30 * (2 ** failures), 300)
        time.sleep(delay)


def main():
    if needs_setup():
        cfg = start_config_portal()
    else:
        cfg = load_config()
    if connect_wifi(cfg.get("ssid", ""), cfg.get("password", "")):
        sync_loop(cfg)
    else:
        print("failed to connect to Wi-Fi")


if __name__ == "__main__":
    main()
