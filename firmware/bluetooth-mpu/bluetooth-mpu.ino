// Revive Motion — Elegoo Uno R3 + MPU-6050 + HC-05 Bluetooth
// File → Open this file. Do not paste it into an old sketch.
// MPU: VCC -> Uno 3.3V. GND -> GND. SDA -> A4. SCL -> A5.
// HC-05: VCC -> Uno 5V. GND -> GND. TXD -> pin 0 (RX). RXD -> pin 1 (TX).
// Leave EN, STATE, KEY, INT, and AD0 empty. Do not use pins 2 or 3.
// Tools → Board → Arduino Uno. Unplug the wires on pins 0 and 1, Upload, then plug them back.
// Close Serial Monitor. Unplug the Uno from the Mac and power it from a phone charger.

#include <Wire.h>

const int PIN_SDA = A4;
const int PIN_SCL = A5;
const uint8_t ADDRS[] = { 0x68, 0x69 };

uint8_t addr = 0x68;
int sdaPin = PIN_SDA;
int sclPin = PIN_SCL;
bool useSoft = false;
bool i2cReady = false;
unsigned long lastScanMs = 0;
unsigned long lastHelloMs = 0;

void printHello() {
  Serial.println("HELLO MPU6050 ELEGOO_UNO_R3");
  Serial.println("SRC ELEGOO_UNO_R3");
  Serial.println("CHIP MPU6050");
}

void i2cDelay() {
  delayMicroseconds(20);
}

void sdaHigh() {
  pinMode(sdaPin, INPUT_PULLUP);
}

void sdaLow() {
  pinMode(sdaPin, OUTPUT);
  digitalWrite(sdaPin, LOW);
}

void sclHigh() {
  pinMode(sclPin, INPUT_PULLUP);
  unsigned long started = micros();
  while (digitalRead(sclPin) == LOW && (micros() - started) < 1000) {
    /* clock stretch */
  }
}

void sclLow() {
  pinMode(sclPin, OUTPUT);
  digitalWrite(sclPin, LOW);
}

int sdaRead() {
  pinMode(sdaPin, INPUT_PULLUP);
  return digitalRead(sdaPin);
}

void softStart() {
  sdaHigh();
  sclHigh();
  i2cDelay();
  sdaLow();
  i2cDelay();
  sclLow();
  i2cDelay();
}

void softStop() {
  sdaLow();
  i2cDelay();
  sclHigh();
  i2cDelay();
  sdaHigh();
  i2cDelay();
}

bool softWriteByte(uint8_t value) {
  for (uint8_t i = 0; i < 8; i++) {
    if (value & 0x80) sdaHigh();
    else sdaLow();
    i2cDelay();
    sclHigh();
    i2cDelay();
    sclLow();
    i2cDelay();
    value <<= 1;
  }
  sdaHigh();
  i2cDelay();
  sclHigh();
  i2cDelay();
  const bool ack = sdaRead() == LOW;
  sclLow();
  i2cDelay();
  return ack;
}

uint8_t softReadByte(bool ack) {
  uint8_t value = 0;
  sdaHigh();
  for (uint8_t i = 0; i < 8; i++) {
    value <<= 1;
    sclHigh();
    i2cDelay();
    if (sdaRead()) value |= 1;
    sclLow();
    i2cDelay();
  }
  if (ack) sdaLow();
  else sdaHigh();
  i2cDelay();
  sclHigh();
  i2cDelay();
  sclLow();
  i2cDelay();
  sdaHigh();
  return value;
}

void recoverBus() {
  Serial.println("BUS RECOVER");
  Wire.end();
  pinMode(PIN_SDA, INPUT_PULLUP);
  pinMode(PIN_SCL, OUTPUT);
  for (uint8_t i = 0; i < 9; i++) {
    digitalWrite(PIN_SCL, HIGH);
    delayMicroseconds(8);
    digitalWrite(PIN_SCL, LOW);
    delayMicroseconds(8);
  }
  pinMode(PIN_SDA, OUTPUT);
  digitalWrite(PIN_SDA, LOW);
  digitalWrite(PIN_SCL, HIGH);
  delayMicroseconds(8);
  digitalWrite(PIN_SDA, HIGH);
  delayMicroseconds(8);
  pinMode(PIN_SDA, INPUT_PULLUP);
  pinMode(PIN_SCL, INPUT_PULLUP);
}

void beginWire(uint32_t hz, bool pullups) {
  useSoft = false;
  sdaPin = PIN_SDA;
  sclPin = PIN_SCL;
  Wire.end();
  pinMode(PIN_SDA, pullups ? INPUT_PULLUP : INPUT);
  pinMode(PIN_SCL, pullups ? INPUT_PULLUP : INPUT);
  Wire.begin();
  Wire.setClock(hz);
#if defined(WIRE_HAS_TIMEOUT)
  Wire.setWireTimeout(3000, true);
#endif
}

void beginSoft(int sda, int scl) {
  useSoft = true;
  sdaPin = sda;
  sclPin = scl;
  Wire.end();
  sdaHigh();
  sclHigh();
  delay(20);
}

bool ping(uint8_t a) {
  if (useSoft) {
    softStart();
    const bool ack = softWriteByte((uint8_t)(a << 1));
    softStop();
    return ack;
  }
  Wire.beginTransmission(a);
  return Wire.endTransmission() == 0;
}

void writeReg(uint8_t a, uint8_t reg, uint8_t value) {
  if (useSoft) {
    softStart();
    if (!softWriteByte((uint8_t)(a << 1))) {
      softStop();
      return;
    }
    softWriteByte(reg);
    softWriteByte(value);
    softStop();
    return;
  }
  Wire.beginTransmission(a);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

uint8_t readReg(uint8_t a, uint8_t reg) {
  if (useSoft) {
    softStart();
    if (!softWriteByte((uint8_t)(a << 1))) {
      softStop();
      return 0;
    }
    softWriteByte(reg);
    softStart();
    if (!softWriteByte((uint8_t)((a << 1) | 1))) {
      softStop();
      return 0;
    }
    const uint8_t value = softReadByte(false);
    softStop();
    return value;
  }
  Wire.beginTransmission(a);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return 0;
  if (Wire.requestFrom(a, (uint8_t)1) < 1) return 0;
  if (Wire.available()) return Wire.read();
  return 0;
}

void printScan() {
  Serial.print("SCAN");
  bool any = false;
  for (uint8_t i = 0; i < 2; i++) {
    if (ping(ADDRS[i])) {
      Serial.print(" 0x");
      Serial.print(ADDRS[i], HEX);
      any = true;
    }
  }
  if (!any) Serial.print(" none");
  Serial.println();
}

bool findSensor() {
  for (uint8_t i = 0; i < 2; i++) {
    if (ping(ADDRS[i])) {
      addr = ADDRS[i];
      return true;
    }
  }
  return false;
}

bool wake(uint8_t a) {
  writeReg(a, 0x6B, 0x00);
  delay(40);
  return ping(a);
}

bool configureFoundSensor() {
  wake(addr);
  const uint8_t who = readReg(addr, 0x75);
  Serial.print("WHO ");
  Serial.println(who);
  Serial.print("ADDR 0x");
  Serial.println(addr, HEX);
  Serial.println("I2C OK");
  return true;
}

bool startSensor() {
  recoverBus();

  const uint32_t speeds[] = { 100000UL, 50000UL, 25000UL };
  const bool pullModes[] = { true, false };

  for (uint8_t p = 0; p < 2; p++) {
    for (uint8_t s = 0; s < 3; s++) {
      beginWire(speeds[s], pullModes[p]);
      delay(30);
      Serial.print("I2C MODE pullup=");
      Serial.print(pullModes[p] ? "on" : "off");
      Serial.print(" hz=");
      Serial.println(speeds[s]);
      printScan();
      if (!findSensor()) continue;
      Serial.println("I2C PINS SDA=A4 SCL=A5");
      return configureFoundSensor();
    }
  }

  Serial.println("I2C SWAP try SDA=A5 SCL=A4");
  beginSoft(PIN_SCL, PIN_SDA);
  delay(30);
  printScan();
  if (findSensor()) {
    Serial.println("I2C PINS SDA=A5 SCL=A4");
    return configureFoundSensor();
  }

  Serial.println("I2C SWAP try SDA=A4 SCL=A5 soft");
  beginSoft(PIN_SDA, PIN_SCL);
  delay(30);
  printScan();
  if (findSensor()) {
    Serial.println("I2C PINS SDA=A4 SCL=A5");
    return configureFoundSensor();
  }

  beginWire(100000UL, true);
  Serial.println("ERR no I2C. Check VCC power, GND, then swap SCL and SDA.");
  return false;
}

bool readAccel(int16_t *ax, int16_t *ay, int16_t *az) {
  if (useSoft) {
    softStart();
    if (!softWriteByte((uint8_t)(addr << 1))) {
      softStop();
      return false;
    }
    softWriteByte(0x3B);
    softStart();
    if (!softWriteByte((uint8_t)((addr << 1) | 1))) {
      softStop();
      return false;
    }
    uint8_t b0 = softReadByte(true);
    uint8_t b1 = softReadByte(true);
    uint8_t b2 = softReadByte(true);
    uint8_t b3 = softReadByte(true);
    uint8_t b4 = softReadByte(true);
    uint8_t b5 = softReadByte(false);
    softStop();
    *ax = (int16_t)((b0 << 8) | b1);
    *ay = (int16_t)((b2 << 8) | b3);
    *az = (int16_t)((b4 << 8) | b5);
    return true;
  }

  Wire.beginTransmission(addr);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(addr, (uint8_t)6) < 6) return false;
  *ax = (int16_t)((Wire.read() << 8) | Wire.read());
  *ay = (int16_t)((Wire.read() << 8) | Wire.read());
  *az = (int16_t)((Wire.read() << 8) | Wire.read());
  return true;
}

void setup() {
  Serial.begin(9600);
  delay(800);
  printHello();
  i2cReady = startSensor();
  lastScanMs = millis();
  lastHelloMs = millis();
}

void loop() {
  const unsigned long now = millis();

  if (Serial.available()) {
    while (Serial.available()) Serial.read();
    printHello();
    Serial.println(i2cReady ? "PONG MPU6050" : "PONG NONE");
  }

  if (!i2cReady && now - lastHelloMs > 4000) {
    lastHelloMs = now;
    printHello();
  }

  if (!i2cReady) {
    if (now - lastScanMs > 3000) {
      lastScanMs = now;
      Serial.println("RETRY I2C");
      i2cReady = startSensor();
    }
    delay(20);
    return;
  }

  int16_t ax = 0, ay = 0, az = 0;
  if (!readAccel(&ax, &ay, &az)) {
    Serial.println("ERR I2C dropped. Recovering.");
    i2cReady = false;
    lastScanMs = 0;
    delay(40);
    return;
  }

  float pitch = atan2((float)ay, (float)az) * 57.2957795f;
  if (pitch < 0) pitch += 360.0f;
  if (pitch > 180.0f) pitch = 360.0f - pitch;
  int angle = (int)(pitch + 0.5f);
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;

  Serial.print("ANGLE ");
  Serial.println(angle);

  delay(50);
}
