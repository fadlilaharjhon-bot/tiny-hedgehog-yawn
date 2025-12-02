import network
import time
from umqtt.simple import MQTTClient
import ujson
from machine import Pin

# --- KONFIGURASI ---
WIFI_SSID = "NAMA_WIFI_ANDA"
WIFI_PASS = "PASSWORD_WIFI_ANDA"
MQTT_BROKER = "broker.hivemq.com"
CLIENT_ID = "esp32-room-lights-client"

# --- PINOUT (sesuaikan dengan board Anda) ---
# Nama lampu sesuai dengan urutan di dashboard
# lamp1 = R. Tamu, lamp2 = R. Keluarga, lamp3 = K. Tidur
LAMP_PINS = {
    'lamp1': Pin(2, Pin.OUT),
    'lamp2': Pin(4, Pin.OUT),
    'lamp3': Pin(5, Pin.OUT),
}

# --- TOPIK MQTT ---
TOPIC_ROOM_STATUS = b"POLINES/LAMPU_RUANG/STATUS"
TOPIC_ROOM_COMMAND = b"POLINES/LAMPU_RUANG/COMMAND"

# --- State Awal Lampu ---
lamp_states = {
    'lamp1': False,
    'lamp2': False,
    'lamp3': False,
}

# Inisialisasi pin ke kondisi mati
for pin in LAMP_PINS.values():
    pin.value(0)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print('Connecting to network...')
        wlan.connect(WIFI_SSID, WIFI_PASS)
        while not wlan.isconnected():
            pass
    print('Network config:', wlan.ifconfig())

def publish_status(client):
    """Mengirim status semua lampu ke broker."""
    try:
        payload = ujson.dumps(lamp_states)
        client.publish(TOPIC_ROOM_STATUS, payload)
        print(f"Published status: {payload}")
    except Exception as e:
        print(f"Error publishing status: {e}")

def mqtt_callback(topic, msg):
    """Menangani pesan masuk dari broker."""
    print(f"Message received: Topic='{topic.decode()}', Msg='{msg.decode()}'")
    try:
        command = ujson.loads(msg)
        
        # Cek apakah ada perintah toggle individual
        for lamp_key in ['lamp1', 'lamp2', 'lamp3']:
            if command.get(f'toggle_{lamp_key}'):
                lamp_states[lamp_key] = not lamp_states[lamp_key]
                LAMP_PINS[lamp_key].value(1 if lamp_states[lamp_key] else 0)
                print(f"Toggled {lamp_key} to {'ON' if lamp_states[lamp_key] else 'OFF'}")

        # Cek perintah global
        if command.get('command') == 'all_on':
            for key in lamp_states:
                lamp_states[key] = True
                LAMP_PINS[key].value(1)
            print("All lamps turned ON")
        elif command.get('command') == 'all_off':
            for key in lamp_states:
                lamp_states[key] = False
                LAMP_PINS[key].value(0)
            print("All lamps turned OFF")
            
        # Kirim status terbaru setelah perubahan
        publish_status(client)

    except Exception as e:
        print(f"Error processing command: {e}")

# --- MAIN PROGRAM ---
connect_wifi()
client = MQTTClient(CLIENT_ID, MQTT_BROKER)
client.set_callback(mqtt_callback)
client.connect()
client.subscribe(TOPIC_ROOM_COMMAND)
print(f"Connected to {MQTT_BROKER} and subscribed to {TOPIC_ROOM_COMMAND.decode()}")

# Kirim status awal saat pertama kali terhubung
publish_status(client)

try:
    while True:
        client.check_msg()
        time.sleep(1)
except KeyboardInterrupt:
    print('Disconnected')
finally:
    client.disconnect()