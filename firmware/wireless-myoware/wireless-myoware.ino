// Revive Motion — MyoWare 2.0 Wireless Shield (ESP32)
// File → Open this file. Do not paste into an old sketch.
// Arduino IDE → Tools → Board → ESP32 Arduino → ESP32 Dev Module
// The programming cable goes into the Wireless Shield, not the Elegoo Uno. Then connect over Bluetooth.
// POWER SOURCE = VBAT. POWER = ON to upload. Then POWER OFF, unplug, snap onto the muscle sensor.

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

static const char *DEVICE_NAME = "MyoWareSensor1";
static const char *SERVICE_UUID = "ec3af789-2154-49f4-a9fc-bc6c88e9e930";
static const char *CHAR_UUID = "f3a56edf-8f1e-4533-93bf-5601b2e91308";

const int PIN_ENV = A3;
const int PIN_LED = 13;

BLECharacteristic *sensorChar = nullptr;
bool centralConnected = false;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *) {
    centralConnected = true;
    digitalWrite(PIN_LED, HIGH);
  }

  void onDisconnect(BLEServer *server) {
    centralConnected = false;
    digitalWrite(PIN_LED, LOW);
    delay(80);
    server->startAdvertising();
  }
};

void setup() {
  analogReadResolution(12);
  pinMode(PIN_ENV, INPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  BLEDevice::init(DEVICE_NAME);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);
  sensorChar = service->createCharacteristic(
    CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  sensorChar->addDescriptor(new BLE2902());
  sensorChar->setValue("HELLO MYOWARE WIRELESS");
  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  BLEDevice::startAdvertising();
}

void loop() {
  const int env = analogRead(PIN_ENV);
  int emg = env / 41;
  if (emg > 100) emg = 100;

  char line[48];
  snprintf(line, sizeof(line), "ENV %d\nEMG %d", env, emg);

  if (centralConnected && sensorChar) {
    sensorChar->setValue(line);
    sensorChar->notify();
  } else {
    digitalWrite(PIN_LED, (millis() / 400) % 2 ? HIGH : LOW);
  }

  delay(80);
}
