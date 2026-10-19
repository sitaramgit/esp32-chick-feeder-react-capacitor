#include <ESP32Servo.h>

Servo feederServo;

#define SERVO_PIN 18

void setup() {
  Serial.begin(115200);

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  feederServo.setPeriodHertz(50);
  feederServo.attach(SERVO_PIN, 500, 2500);
.
  // Start closed
  closeFeeder();
  delay(1000);
}

void loop() {
  openFeeder();     // Move to 0°
  delay(3000);

  closeFeeder();    // Move to 120°
  delay(5000);
}

// ========== Functions ==========

void openFeeder() {
  Serial.println("Opening (180°)");
  feederServo.write(180);
}

void closeFeeder() {
  Serial.println("Closing (45°)");
  feederServo.write(45);
}