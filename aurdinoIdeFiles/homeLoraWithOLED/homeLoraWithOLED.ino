#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1     // Reset pin not used

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Pin definitions
#define ss    5     // LoRa CS
#define rst   14    // LoRa Reset
#define dio0  2     // LoRa DIO0
#define BUZZER 25   // Buzzer pin

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=============================");
  Serial.println("ESP32 LoRa Receiver");
  Serial.println("=============================\n");
  
  // Buzzer
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);
  
  // OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0,0);
  display.println("LoRa Receiver");
  display.println("Starting...");
  display.display();
  delay(1000);

  // LoRa setup
  Serial.println("Setting up LoRa pins...");
  LoRa.setPins(ss, rst, dio0);
  
  Serial.println("Initializing LoRa at 433MHz...");
  if (!LoRa.begin(433E6)) {
    Serial.println("❌ LoRa init failed!");
    display.clearDisplay();
    display.setCursor(0,0);
    display.println("LoRa Failed!");
    display.display();
    while (1);
  }

  // ⚠️ CRITICAL: Match transmitter settings
  Serial.println("Configuring LoRa parameters...");
  LoRa.setSpreadingFactor(12);        // Must match transmitter
  LoRa.setSignalBandwidth(125E3);     // Must match transmitter
  LoRa.setCodingRate4(8);             // Default, but explicit
  LoRa.setPreambleLength(8);          // Default
  LoRa.setSyncWord(0x12);             // Default
  LoRa.enableCrc();                   // Enable error checking
  
  Serial.println("✅ LoRa initialized!");
  Serial.println("   Frequency: 433 MHz");
  Serial.println("   Spreading Factor: 12");
  Serial.println("   Bandwidth: 125 kHz");
  Serial.println("\nWaiting for messages...\n");

  display.clearDisplay();
  display.setCursor(0,0);
  display.println("LoRa Ready!");
  display.println("SF: 12");
  display.println("BW: 125kHz");
  display.println("");
  display.println("Waiting...");
  display.display();
  
  // Beep to confirm ready
  tone(BUZZER, 2000, 100);
  delay(150);
  tone(BUZZER, 2500, 100);
}

void loop() {
  int packetSize = LoRa.parsePacket();
  
  if (packetSize) {
    String message = "";
    while (LoRa.available()) {
      message += (char)LoRa.read();
    }

    int rssi = LoRa.packetRssi();

    // Show on OLED
    display.clearDisplay();
    display.setCursor(0, 0);
    display.setTextSize(1);
    display.println("Message Received!");
    display.println("----------------");
    display.println(message);
    display.println("");
    display.print("RSSI: ");
    display.print(rssi);
    display.println(" dBm");
    display.display();

    // Buzzer beep (short alert)
    tone(BUZZER, 1000, 300);   // 1000Hz for 300ms
    delay(350);

    Serial.print("Received: ");
    Serial.print(message);
    Serial.print(" | RSSI: ");
    Serial.println(rssi);
  }
}