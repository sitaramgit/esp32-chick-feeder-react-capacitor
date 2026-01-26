#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Define UUIDs (use these in the app too)
#define SERVICE_UUID "91bad492-b950-4226-aa2b-4ede9fa42f59"
#define CHARACTERISTIC_UUID "cba1d466-344c-4be3-ab3f-189f80dd7518"
#define LED_PIN 2
// Connection status
bool deviceConnected = false;

// Characteristic with read/write/notify
BLECharacteristic *pCharacteristic;

// Timer for sending data
unsigned long lastTime = 0;
unsigned long timerDelay = 5000; // Send every 5 seconds

void blinkLED(int times, int delayMs = 200) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}
// Callbacks for connection
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Device connected");
  };
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Device disconnected");
  }
};

// Callback for write from client (app)
class MyCharacteristicCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
  String rxValue = pCharacteristic->getValue();

  if (rxValue.length() > 0) {
    Serial.print("Received (");
    Serial.print(rxValue.length());
    Serial.print(" bytes): ");
    Serial.println(rxValue);

    // Optional: react to specific commands
    if (rxValue == "ON") {
      // digitalWrite(LED_PIN, HIGH);
      Serial.println("→ Turning something ON");
    }
    
    Serial.println("Received command: " + rxValue);

    if (rxValue == "FWD") {
      blinkLED(1);          // 1 blink
      // motor forward

    } else if (rxValue == "BWD") {
      blinkLED(2);          // 2 blinks
      // motor backward

    } else if (rxValue == "LFT") {
      blinkLED(3);          // 3 blinks
      // rotate left

    } else if (rxValue == "RGT") {
      blinkLED(4);          // 4 blinks
      // rotate right

    } else if (rxValue == "FEED_ON") {
      blinkLED(5, 150);     // fast 5 blinks
      // activate feeder

    } else if (rxValue == "WATER_ON") {
      blinkLED(6, 150);     // fast 6 blinks
      // activate water
    }
  }
}
};

void setup() {
  Serial.begin(115200);
    pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Initialize BLE
  BLEDevice::init("MyESP32"); // Device name

  // Create server
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
pAdvertising->addServiceUUID(SERVICE_UUID);           // optional but try
pAdvertising->setScanResponse(true);                  // important
pAdvertising->setMinPreferred(0x06);                  // Apple/Android friendly interval
pAdvertising->setMinPreferred(0x12);
BLEDevice::startAdvertising();

Serial.println("Advertising started - name: MyESP32");

  // Create characteristic
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902()); // For notify config
  pCharacteristic->setCallbacks(new MyCharacteristicCallbacks());

  // Start service and advertising
  pService->start();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();
  Serial.println("Waiting for connection...");
}



void loop() {
  if (deviceConnected && (millis() - lastTime) > timerDelay) {
    // Send data to app via notify
    String message = "Hello from ESP32";
    pCharacteristic->setValue(message.c_str());
    pCharacteristic->notify();
    Serial.println("Sent: " + message);
    lastTime = millis();
  }
}