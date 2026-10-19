#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include <time.h>
#include <ESP32Servo.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DFRobotDFPlayerMini.h>

// ==================== PINS ====================
#define DHTPIN              4
#define FEEDER_MOTOR_PIN    14
#define GATE_IN1            16
#define GATE_IN2            17
#define SERVO_PIN           18
#define DFPLAYER_RX         19
#define OLED_SDA            21
#define OLED_SCL            22
#define EXHAUST_FAN_PIN     23
#define LED_PIN             25
#define PUMP_PIN            26
#define DFPLAYER_TX         27
#define LIMIT_MIN           32
#define LIMIT_MAX           33
#define BULB1_PIN           5
#define BULB2_PIN           13
#define SOIL_PIN            34

// ==================== OBJECTS ====================
DHT dht(DHTPIN, DHT22);
Servo feederServo;
Adafruit_SSD1306 display(128, 64, &Wire, -1);
HardwareSerial dfSerial(2);
DFRobotDFPlayerMini dfplayer;

// ==================== FIREBASE ====================
UserAuth user_auth("AIzaSyDe8Jbt1lxmVLPHr65ZucM--qIFE4D_v_s", "sitaramkdks@gmail.com", "Sitaram$0279");
FirebaseApp app;
WiFiClientSecure ssl_client1, ssl_client2;
using AsyncClient = AsyncClientClass;
AsyncClient async_client1(ssl_client1), async_client2(ssl_client2);
RealtimeDatabase Database;
AsyncResult dbResult;

// ==================== VARIABLES ====================
String currentGateState = "stop";
String lastGateCommand = "";
String feederServoMode = "manual";
String feederServoState = "close";
String lastServoCommand = "";
String feederMotorMode = "manual";
String feederMotorState = "off";
String lastMotorCommand = "";
String lastMusicCommand = "";

unsigned long lastWifiCheck = 0;
unsigned long lastDisplayChange = 0;
unsigned long lastSensorSync = 0;
unsigned long lastAutoCheck = 0;
unsigned long servoAutoStart = 0;
unsigned long motorAutoStart = 0;
unsigned long lastServoAction = 0;
unsigned long lastMotorAction = 0;

bool servoAutoRunning = false;
bool motorAutoRunning = false;

float temperature = 0;
float humidity = 0;
int soilMoisture = 0;
int displayPage = 0;          // 0~5 for rotating screens

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);

  pinMode(GATE_IN1, OUTPUT);
  pinMode(GATE_IN2, OUTPUT);
  pinMode(LIMIT_MIN, INPUT_PULLUP);
  pinMode(LIMIT_MAX, INPUT_PULLUP);
  pinMode(FEEDER_MOTOR_PIN, OUTPUT);
  pinMode(EXHAUST_FAN_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(BULB1_PIN, OUTPUT);
  pinMode(BULB2_PIN, OUTPUT);

  motorStop();
  digitalWrite(FEEDER_MOTOR_PIN, LOW);
  digitalWrite(EXHAUST_FAN_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(BULB1_PIN, LOW);
  digitalWrite(BULB2_PIN, LOW);

  // Servo
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  feederServo.setPeriodHertz(50);
  feederServo.attach(SERVO_PIN, 500, 2500);
  closeFeederServo();

  dht.begin();

  Wire.begin(OLED_SDA, OLED_SCL);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // DFPlayer
  dfSerial.begin(9600, SERIAL_8N1, DFPLAYER_RX, DFPLAYER_TX);
  if (dfplayer.begin(dfSerial)) {
    dfplayer.volume(22);
    Serial.println("DFPlayer Ready");
  }

  // WiFi
  WiFi.begin("Siggundali", "sitaram123");
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");

  ssl_client1.setInsecure();
  ssl_client2.setInsecure();
  initializeApp(async_client1, app, getAuth(user_auth), processData, "authTask");
  app.getApp<RealtimeDatabase>(Database);
  Database.url("https://iot-testing-68711-default-rtdb.firebaseio.com");

  Serial.println("===== SYSTEM READY =====");
}

// ==================== LOOP ====================
void loop() {
  app.loop();

  // -------- Strong WiFi Auto Reconnect --------
  if (millis() - lastWifiCheck > 5000) {
    lastWifiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi lost... Reconnecting");
      WiFi.disconnect();
      WiFi.begin("Siggundali", "sitaram123");
    }
  }

  // -------- OLED Rotate every 2 seconds --------
  if (millis() - lastDisplayChange > 2000) {
    lastDisplayChange = millis();
    displayPage++;
    if (displayPage > 5) displayPage = 0;
    updateOLED();
  }

  // -------- Sensor Sync to Firebase every 10 minutes --------
  if (millis() - lastSensorSync > 600000) {   // 10 minutes
    lastSensorSync = millis();
    syncSensorsToFirebase();
  }

  // -------- Auto Schedule Check --------
  if (millis() - lastAutoCheck > 10000) {
    lastAutoCheck = millis();
    checkAutoSchedule();
  }

  // Stop auto after 60 seconds
  if (servoAutoRunning && millis() - servoAutoStart >= 60000) {
    closeFeederServo();
    servoAutoRunning = false;
  }
  if (motorAutoRunning && millis() - motorAutoStart >= 60000) {
    feederMotorOff();
    motorAutoRunning = false;
  }

  // ================= FIREBASE CONTROL =================
  if (app.ready()) {

    // Gate
    handleStringCommand("/controls/gate", lastGateCommand, [](String cmd) {
      currentGateState = cmd;
      if (cmd == "open") playSound(1);
      if (cmd == "close") playSound(2);
    }, {"open", "close", "stop"});

    // Feeder Servo Mode + Command
    handleStringCommand("/mode/feeder_servo", feederServoMode, [](String m){}, {"auto", "manual"});
    
    if (feederServoMode == "manual") {
      handleStringCommand("/controls/feeder_servo", lastServoCommand, [](String cmd) {
        if (cmd == "open") { openFeederServo(); playSound(3); }
        else { closeFeederServo(); playSound(4); }
      }, {"open", "close"});
    }

    // Feeder Motor Mode + Command
    handleStringCommand("/mode/feeder_motor", feederMotorMode, [](String m){}, {"auto", "manual"});
    
    if (feederMotorMode == "manual") {
      handleStringCommand("/controls/feeder_motor", lastMotorCommand, [](String cmd) {
        if (cmd == "on") feederMotorOn();
        else feederMotorOff();
      }, {"on", "off"});
    }

    // Music Control from Firebase
    // Send number → play that track   (example: 5)
    // Send "folder" → play all songs in folder 01
    String musicCmd = Database.get<String>(async_client2, "/controls/music");
    if (async_client2.lastError().code() == 0 && musicCmd != lastMusicCommand) {
      lastMusicCommand = musicCmd;
      musicCmd.trim();

      if (musicCmd == "folder") {
        dfplayer.loopFolder(1);          // Play all songs in folder 01 continuously
        Serial.println("Playing Folder 01");
      } 
      else if (musicCmd == "stop") {
        dfplayer.stop();
      }
      else {
        int track = musicCmd.toInt();
        if (track > 0) {
          dfplayer.play(track);
          Serial.print("Playing track: ");
          Serial.println(track);
        }
      }
    }

    // Simple ON/OFF devices
    controlDevice("/controls/exhaust_fan", EXHAUST_FAN_PIN);
    controlDevice("/controls/led", LED_PIN);
    controlDevice("/controls/pump", PUMP_PIN);
    controlDevice("/controls/bulb1", BULB1_PIN);
    controlDevice("/controls/bulb2", BULB2_PIN);
  }

  applyGateState();
}

// ==================== HELPER FUNCTIONS ====================
void controlDevice(const char* path, int pin) {
  String cmd = Database.get<String>(async_client2, path);
  if (async_client2.lastError().code() == 0) {
    cmd.toLowerCase(); cmd.trim();
    digitalWrite(pin, (cmd == "on") ? HIGH : LOW);
  }
}

template<typename Func>
void handleStringCommand(const char* path, String &lastCmd, Func action, std::initializer_list<const char*> valid) {
  String cmd = Database.get<String>(async_client2, path);
  if (async_client2.lastError().code() != 0) return;
  cmd.toLowerCase(); cmd.trim();
  bool ok = false;
  for (auto v : valid) if (cmd == v) ok = true;
  if (ok && cmd != lastCmd) {
    lastCmd = cmd;
    action(cmd);
  }
}

void motorOpen()  { digitalWrite(GATE_IN1, LOW);  digitalWrite(GATE_IN2, HIGH); }
void motorClose() { digitalWrite(GATE_IN1, HIGH); digitalWrite(GATE_IN2, LOW);  }
void motorStop()  { digitalWrite(GATE_IN1, LOW);  digitalWrite(GATE_IN2, LOW);  }

void applyGateState() {
  if (currentGateState == "open") {
    if (digitalRead(LIMIT_MAX) == LOW) { motorStop(); currentGateState = "stop"; }
    else motorOpen();
  } else if (currentGateState == "close") {
    if (digitalRead(LIMIT_MIN) == LOW) { motorStop(); currentGateState = "stop"; }
    else motorClose();
  } else motorStop();
}

void openFeederServo() {
  feederServo.write(180);
  feederServoState = "open";
  lastServoAction = millis();
}

void closeFeederServo() {
  feederServo.write(45);
  feederServoState = "close";
  lastServoAction = millis();
}

void feederMotorOn() {
  digitalWrite(FEEDER_MOTOR_PIN, HIGH);
  feederMotorState = "on";
  lastMotorAction = millis();
}

void feederMotorOff() {
  digitalWrite(FEEDER_MOTOR_PIN, LOW);
  feederMotorState = "off";
  lastMotorAction = millis();
}

void playSound(int track) {
  dfplayer.play(track);
}

void syncSensorsToFirebase() {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  soilMoisture = analogRead(SOIL_PIN);

  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char timeStr[25];
    strftime(timeStr, sizeof(timeStr), "%Y-%m-%d %H:%M:%S", &timeinfo);

    Database.set(async_client2, "/sensors/temperature", temperature);
    Database.set(async_client2, "/sensors/humidity", humidity);
    Database.set(async_client2, "/sensors/soil", soilMoisture);
    Database.set(async_client2, "/sensors/last_update", String(timeStr));
    
    Serial.println("Sensors synced to Firebase");
  }
}

void updateOLED() {
  display.clearDisplay();
  display.setCursor(0, 0);

  struct tm timeinfo;
  getLocalTime(&timeinfo);
  char timeBuf[20];
  strftime(timeBuf, sizeof(timeBuf), "%H:%M:%S", &timeinfo);
  char dateBuf[20];
  strftime(dateBuf, sizeof(dateBuf), "%d-%m-%Y", &timeinfo);

  switch (displayPage) {
    case 0:
      display.println("=== WEATHER ===");
      display.print("Temp: "); display.print(temperature); display.println(" C");
      display.print("Humi: "); display.print(humidity); display.println(" %");
      break;

    case 1:
      display.println("=== SOIL ===");
      display.print("Moisture: ");
      display.println(soilMoisture);
      display.println(soilMoisture > 2500 ? "Dry" : "Wet");
      break;

    case 2:
      display.println("=== TIME ===");
      display.println(dateBuf);
      display.println(timeBuf);
      break;

    case 3:
      display.println("=== SERVO ===");
      display.print("State: "); display.println(feederServoState);
      display.print("Mode : "); display.println(feederServoMode);
      break;

    case 4:
      display.println("=== FEEDER MOTOR ===");
      display.print("State: "); display.println(feederMotorState);
      display.print("Mode : "); display.println(feederMotorMode);
      break;

    case 5:
      display.println("=== GATE ===");
      display.print("State: "); display.println(currentGateState);
      display.print("WiFi : ");
      display.println(WiFi.status() == WL_CONNECTED ? "OK" : "LOST");
      break;
  }
  display.display();
}

void checkAutoSchedule() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return;

  int h = timeinfo.tm_hour;
  int m = timeinfo.tm_min;

  if ((h == 6 && m == 30) || (h == 17 && m == 30)) {
    if (feederServoMode == "auto" && !servoAutoRunning) {
      openFeederServo();
      playSound(7);
      servoAutoStart = millis();
      servoAutoRunning = true;
    }
    if (feederMotorMode == "auto" && !motorAutoRunning) {
      feederMotorOn();
      motorAutoStart = millis();
      motorAutoRunning = true;
    }
  }
}

void processData(AsyncResult &aResult) {
  if (aResult.isError()) {
    Serial.println(aResult.error().message().c_str());
  }
}