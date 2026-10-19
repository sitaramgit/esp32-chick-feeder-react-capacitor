#include <Arduino.h>
#include <DFRobotDFPlayerMini.h>

HardwareSerial dfSerial(2);
DFRobotDFPlayerMini dfPlayer;

#define DF_RX 27   // ESP32 RX  <- DFPlayer TX
#define DF_TX 19   // ESP32 TX  -> DFPlayer RX

void setup() {
  Serial.begin(115200);

  Serial.println();
  Serial.println("================================");
  Serial.println("DFPlayer Mini Test");
  Serial.println("================================");

  // RX, TX
  dfSerial.begin(9600, SERIAL_8N1, DF_RX, DF_TX);

  Serial.println("Starting DFPlayer...");

  if (!dfPlayer.begin(dfSerial)) {
    Serial.println("ERROR: DFPlayer not detected!");
    Serial.println("Check:");
    Serial.println("1. VCC -> 5V");
    Serial.println("2. GND -> GND");
    Serial.println("3. ESP32 GPIO19 -> DFPlayer RX");
    Serial.println("4. ESP32 GPIO27 -> DFPlayer TX");
    Serial.println("5. microSD card");
    while (true) {
      delay(1000);
    }
  }

  Serial.println("DFPlayer connected!");

  dfPlayer.volume(30);  // 0-30

  delay(500);

  Serial.println("Playing 001.mp3");
  dfPlayer.play(1);
  delay(5000);
  dfPlayer.play(2);
  delay(5000);
  dfPlayer.play(3);
  delay(5000);
}

void loop() {

  if (Serial.available()) {

    char command = Serial.read();

    switch (command) {

      case '1':
        Serial.println("Playing 001.mp3");
        dfPlayer.play(1);
        break;

      case '2':
        Serial.println("Playing 002.mp3");
        dfPlayer.play(2);
        break;

      case '3':
        Serial.println("Playing 003.mp3");
        dfPlayer.play(3);
        break;

      case '4':
        Serial.println("Playing 004.mp3");
        dfPlayer.play(4);
        break;

      case '5':
        Serial.println("Playing 005.mp3");
        dfPlayer.play(5);
        break;

      case '+':
        dfPlayer.volumeUp();
        Serial.println("Volume UP");
        break;

      case '-':
        dfPlayer.volumeDown();
        Serial.println("Volume DOWN");
        break;

      case 's':
        dfPlayer.stop();
        Serial.println("STOP");
        break;
    }
  }
}