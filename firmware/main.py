import json
import network
import socket
import machine
import os

CONFIG_FILE = "config.json"
AP_SSID = "BusStopSetup"
AP_PASSWORD = "config123"


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


def main():
    if needs_setup():
        cfg = start_config_portal()
    else:
        cfg = load_config()
    # at this point, configuration is available in cfg
    # subsequent startup logic would go here


if __name__ == "__main__":
    main()
