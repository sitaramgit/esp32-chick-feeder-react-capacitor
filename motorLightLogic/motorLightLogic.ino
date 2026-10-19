#define PUMP_PIN  26
#define LIGHT_PIN 25

void setup() {
  Serial.begin(115200);

  pinMode(PUMP_PIN, OUTPUT);
  pinMode(LIGHT_PIN, OUTPUT);

  // Low-level trigger → HIGH = OFF
  digitalWrite(PUMP_PIN, HIGH);
  digitalWrite(LIGHT_PIN, HIGH);
  delay(5000);
digitalWrite(PUMP_PIN, LOW);
digitalWrite(LIGHT_PIN, LOW);
delay(5000);
digitalWrite(LIGHT_PIN, HIGH);
digitalWrite(PUMP_PIN, HIGH);
  Serial.println("HW-517 Test Started");
  Serial.println("P = Pump");
  Serial.println("L = Lights");
  Serial.println("A = All ON");
  Serial.println("O = All OFF");
}

void loop() {

  if (Serial.available()) {

    char command = Serial.read();

    switch (command) {

      case 'P':
      case 'p':
        digitalWrite(PUMP_PIN, LOW);
        Serial.println("PUMP ON");
        break;

      case 'L':
      case 'l':
        digitalWrite(LIGHT_PIN, LOW);
        Serial.println("LIGHTS ON");
        break;

      case 'A':
      case 'a':
        digitalWrite(PUMP_PIN, LOW);
        digitalWrite(LIGHT_PIN, LOW);
        Serial.println("PUMP + LIGHTS ON");
        break;

      case 'O':
      case 'o':
        digitalWrite(PUMP_PIN, HIGH);
        digitalWrite(LIGHT_PIN, HIGH);
        Serial.println("PUMP + LIGHTS OFF");
        break;
    }
  }
}