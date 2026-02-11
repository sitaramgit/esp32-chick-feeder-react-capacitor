// ========================================
// ESP32-CAM + LoRa SX1278 + LCD1602
// Simple 5-second data transmission
// ========================================

#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ===== LORA PIN DEFINITIONS =====
#define LORA_SCK     14
#define LORA_MISO    12
#define LORA_MOSI    13
#define LORA_NSS     15
#define LORA_RST     2
#define LORA_DIO0    4

// ===== I2C LCD =====
LiquidCrystal_I2C lcd(0x27, 16, 2);  // Address 0x27, 16 columns, 2 rows
// If 0x27 doesn't work, try: 0x3F

// ===== VARIABLES =====
unsigned long lastSend = 0;
int messageCounter = 0;

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=============================");
  Serial.println("ESP32-CAM LoRa LCD Test");
  Serial.println("=============================\n");
  
  // ===== INITIALIZE LCD FIRST =====
  Serial.println("Initializing LCD...");
  Wire.begin(14, 15);  // SDA=14, SCL=15
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("LoRa LCD Test");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  delay(2000);
  
  Serial.println("LCD OK!");
  
  // ===== INITIALIZE LORA =====
  Serial.println("Initializing LoRa...");
  lcd.clear();
  lcd.print("Init LoRa...");
  
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);
  
  if (!LoRa.begin(433E6)) {
    Serial.println("❌ LoRa FAILED!");
    lcd.clear();
    lcd.print("LoRa FAILED!");
    while (1) {
      delay(1000);
    }
  }
  
  // Configure LoRa

  LoRa.setTxPower(20);         // Max TX
  LoRa.setSpreadingFactor(12); // Max range
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(8); // IMPORTANT
  LoRa.enableCrc();       // IMPORTANT

  Serial.println("✅ LoRa OK!");
  lcd.clear();
  lcd.print("LoRa Ready!");
  delay(2000);
  
  Serial.println("\n=============================");
  Serial.println("System Ready!");
  Serial.println("Sending data every 5 seconds");
  Serial.println("=============================\n");
}

unsigned long sentDisplayStart = 0;
bool showingSent = false;

// ===== MAIN LOOP =====
void loop() {
    unsigned long now = millis();

    // Show "sent" message for 1.5 seconds
    if (showingSent && now - sentDisplayStart >= 1500) {
        showingSent = false;
        lcd.clear();                    // or show idle screen / next status
        lcd.setCursor(0,0);
        lcd.print("Farm ready");
        // or whatever idle message you want
    }

    // Send every ~5 seconds
    static unsigned long lastSend = 0;
    if (now - lastSend >= 5000) {
        sendData();
        lastSend = now;
    }
    
    // You can add LoRa receive, button reading, sensors etc. here
    // No delay() needed anymore
}

// ===== SEND DATA FUNCTION =====
void sendData() {
    messageCounter++;
    
    String message = "MSG#" + String(messageCounter);
    message += " from farm T:" + String(millis()/1000) + "s";
    
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("Sending #");
    lcd.print(messageCounter);
    
    lcd.setCursor(0,1);
    lcd.print("Wait...");
    
    Serial.print("📡 Sending: "); Serial.println(message);
    
    LoRa.beginPacket();
    LoRa.print(message);
    LoRa.endPacket();
    
    Serial.println("✅ Sent!");
    
    // Start showing "sent" message
    lcd.setCursor(0,0);
    lcd.print("Sent #");
    lcd.print(messageCounter);
    lcd.print("   ");               // clear leftover chars
    
    lcd.setCursor(0,1);
    lcd.print("from farm     ");
    
    sentDisplayStart = millis();
    showingSent = true;
}