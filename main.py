import network
import time
import json
import machine
import ubinascii
import ssl
import dht
from simple import MQTTClient
import config  # Incluye SSID, WIFI_PASSWORD, IOT_CORE_ENDPOINT

# Archivos de certificados
KEY_FILE = "private.pem.key"
CERT_FILE = "certificate.pem.crt"
CA_FILE = "AmazonRootCA1.pem"

# WiFi y MQTT
SSID = config.SSID
PASSWORD = config.WIFI_PASSWORD
MQTT_BROKER = config.IOT_CORE_ENDPOINT
MQTT_CLIENT_ID = ubinascii.hexlify(machine.unique_id())
MQTT_TOPIC = "riego/inteligente"

# Pines
lm35_pin = machine.ADC(27)  # LM35 en GP27
ldr_pin = machine.ADC(28)   # LDR en GP28
fc28_pin = machine.ADC(26)  # FC-28 en GP26
dht_sensor = dht.DHT11(machine.Pin(15))  # DHT11 en GP15
bomba_pin = machine.Pin(14, machine.Pin.OUT)  # Bomba (relé) en GP14

# Funciones
def read_pem(file):
    with open(file, "r") as f:
        text = f.read().strip()
        lines = text.split("\n")
        base64_text = "".join(lines[1:-1])
        return ubinascii.a2b_base64(base64_text)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(SSID, PASSWORD)
    for _ in range(10):
        if wlan.isconnected():
            print("Conectado a WiFi")
            return
        time.sleep(1)
    raise RuntimeError("No se pudo conectar al WiFi")

def read_sensors():
    # LM35
    raw_lm35 = lm35_pin.read_u16()
    voltage_lm35 = (raw_lm35 / 65535.0) * 3.3
    temp_lm35 = voltage_lm35 * 100

    # DHT11
    dht_sensor.measure()
    temp_dht = dht_sensor.temperature()
    hum_dht = dht_sensor.humidity()

     # LDR: mayor valor = más luz → convertir a porcentaje
    luz = ldr_pin.read_u16()
    luz_pct = round((luz / 65535.0) * 100, 2)

    # FC-28: mayor valor = más seco → invertir para que 100% sea muy húmedo
    humedad_suelo = fc28_pin.read_u16()
    humedad_suelo_pct = round((1 - (humedad_suelo / 65535.0)) * 100, 2)

    return {
        "lm35": round(temp_lm35, 2),
        "dht_temp": temp_dht,
        "dht_hum": hum_dht,
        "luz": luz_pct,
        "humedad_suelo": humedad_suelo_pct
    }

def controlar_bomba(humedad_suelo_pct, umbral=30):
    if humedad_suelo_pct < umbral:
        bomba_pin.value(1)  # Activa la bomba
        return True
    else:
        bomba_pin.value(0)  # Apaga la bomba
        return False

def publish_data(client, point):
    datos = read_sensors()
    bomba_activa = controlar_bomba(datos["humedad_suelo"])

    payload = {
        "punto": point,
        "lm35": datos["lm35"],
        "dht_temp": datos["dht_temp"],
        "dht_hum": datos["dht_hum"],
        "luz": datos["luz"],
        "humedad_suelo": datos["humedad_suelo"],
        "bomba": bomba_activa
    }

    client.publish(MQTT_TOPIC, json.dumps(payload))
    print("Datos publicados:", payload)

# Conectar a WiFi
connect_wifi()

# Preparar claves SSL
key = read_pem(KEY_FILE)
cert = read_pem(CERT_FILE)
ca = read_pem(CA_FILE)

# Conectar a MQTT
mqtt_client = MQTTClient(
    client_id=MQTT_CLIENT_ID,
    server=MQTT_BROKER,
    keepalive=60,
    ssl=True,
    ssl_params={
        "key": key,
        "cert": cert,
        "server_hostname": MQTT_BROKER,
        "cert_reqs": ssl.CERT_REQUIRED,
        "cadata": ca
    }
)

print("Conectando a AWS IoT Core...")
mqtt_client.connect()
print("Conectado al broker MQTT.")

# Loop principal
while True:
    for i in range(1, 6):  # publicar 5 registros
        publish_data(mqtt_client, i)
        time.sleep(5)  # espera 5 segundos entre cada registro

    print("Esperando 3 minutos antes del siguiente ciclo...")
    time.sleep(180)  # espera 3 minutos antes de repetir
