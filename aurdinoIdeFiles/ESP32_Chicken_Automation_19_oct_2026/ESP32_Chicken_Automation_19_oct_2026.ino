/*
  ESP32 Chicken Farm Automation - consolidated sketch
  Libraries: FirebaseClient (Mobizt), ESP32Servo, DHT sensor library,
  Adafruit GFX, Adafruit SSD1306, DFRobotDFPlayerMini.

  IMPORTANT:
  - Fill in Wi-Fi, Firebase Web API key, email, password, and RTDB URL.
  - Firebase RTDB rules must permit the authenticated user to read/write these paths.
  - GPIO 34 is input-only; connect soil sensor analog OUT to GPIO34.
  - DFPlayer wiring: ESP32 GPIO19 (TX) -> DFPlayer RX; DFPlayer TX -> ESP32 GPIO27 (RX).
  - Use a separate suitable 5V supply for MG996R and common GND with ESP32.
  - Motors/pump/fans must use correctly rated driver/MOSFET modules and common GND.
  - Gate limit switches are assumed active LOW with INPUT_PULLUP.
  - Outputs are assumed active HIGH. Invert output logic if your MOSFET/driver is active LOW.
*/
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

// ---------------- PIN MAP ----------------
#define DHT_PIN             4
#define FEEDER_MOTOR_PIN    14
#define GATE_IN1            16
#define GATE_IN2            17
#define SERVO_PIN           18
#define DFPLAYER_RX_PIN     27  // ESP32 RX, receives DFPlayer TX
#define DFPLAYER_TX_PIN     19  // ESP32 TX, sends to DFPlayer RX
#define OLED_SDA            21
#define OLED_SCL            22
#define EXHAUST_FAN_PIN     23
#define LED_PIN             25
#define PUMP_PIN            26
#define BULB1_PIN           5
#define BULB2_PIN           13
#define SOIL_PIN            34
#define LIMIT_CLOSED        32
#define LIMIT_OPEN          33

// ---------------- USER SETTINGS ----------------
const char* WIFI_SSID = "chicken";
const char* WIFI_PASSWORD = "12345678";
const char* FIREBASE_API_KEY = "AIzaSyDe8Jbt1lxmVLPHr65ZucM--qIFE4D_v_s";
const char* FIREBASE_USER_EMAIL = "sitaramkdks@gmail.com";
const char* FIREBASE_USER_PASSWORD = "Sitaram$0279";
const char* DATABASE_URL = "https://iot-testing-68711-default-rtdb.firebaseio.com";

// Calibrate this threshold for your soil sensor (raw ESP32 ADC 0..4095).
const int SOIL_DRY_THRESHOLD = 2500;
const int SERVO_OPEN_ANGLE = 180;
const int SERVO_CLOSED_ANGLE = 45;
const uint32_t RUN_DURATION_MS = 60000UL;
const uint32_t DISPLAY_INTERVAL_MS = 2000UL;
const uint32_t SENSOR_INTERVAL_MS = 2500UL;
const uint32_t SENSOR_SYNC_INTERVAL_MS = 600000UL;
const uint32_t FIREBASE_POLL_INTERVAL_MS = 600UL;

DHT dht(DHT_PIN, DHT22);
Servo feederServo;
Adafruit_SSD1306 oled(128, 64, &Wire, -1);
HardwareSerial dfSerial(2);
DFRobotDFPlayerMini dfplayer;

UserAuth user_auth(FIREBASE_API_KEY, FIREBASE_USER_EMAIL, FIREBASE_USER_PASSWORD);
FirebaseApp app;
WiFiClientSecure ssl_client1, ssl_client2;
using AsyncClient = AsyncClientClass;
AsyncClient async_client1(ssl_client1), async_client2(ssl_client2);
RealtimeDatabase Database;

// Firebase commands: /controls/gate = open|close|stop
// /mode/feeder_motor = auto|manual; /controls/feeder_motor = on|off
// /mode/feeder_servo = auto|manual; /controls/feeder_servo = open|close
// other output controls = on|off; /controls/music = play|stop|next|previous|siren|music|1..N|folder
const char* firebasePaths[] = {
  "/controls/gate", "/mode/feeder_servo", "/controls/feeder_servo",
  "/mode/feeder_motor", "/controls/feeder_motor", "/controls/music",
  "/controls/exhaust_fan", "/controls/led", "/controls/pump",
  "/controls/bulb1", "/controls/bulb2"
};
const char* firebaseUids[] = {
  "gate", "servo_mode", "servo", "motor_mode", "motor", "music",
  "fan", "led", "pump", "bulb1", "bulb2"
};
const size_t FIREBASE_READ_COUNT = sizeof(firebasePaths) / sizeof(firebasePaths[0]);
size_t firebaseReadIndex = 0;

String gateCommand = "stop", lastGateCommand = "";
String servoMode = "manual", servoCommand = "close", lastServoCommand = "";
String motorMode = "manual", motorCommand = "off", lastMotorCommand = "";
String lastMusicCommand = "";
bool servoAutoRunning = false, motorAutoRunning = false;
uint32_t servoRunStarted = 0, motorRunStarted = 0;
int lastServoScheduleDay = -1, lastMotorScheduleDay = -1;
String lastServoActionTime = "--", lastMotorActionTime = "--";
float temperatureC = NAN, humidityPct = NAN;
int soilRaw = 0;
String lastSensorSyncTime = "Never";
int displayPage = 0;
bool oledReady = false, dfplayerReady = false, timeReady = false;
uint32_t lastDisplayMs = 0, lastSensorReadMs = 0, lastSensorSyncMs = 0;
uint32_t lastWifiRetryMs = 0, lastFirebasePollMs = 0;

void processFirebaseRead(AsyncResult &result);
void processFirebaseWrite(AsyncResult &result);
void processFirebaseGeneral(AsyncResult &result);
void applyFirebaseValue(String uid, String value);
void syncSensorsToFirebase();
void updateOLED();
void stopGate();
void feederMotorOn();
void feederMotorOff();
void openFeederServo();
void closeFeederServo();
void playMusicCommand(String command);
String getTimestamp();

void setup() {
  Serial.begin(115200);
  pinMode(FEEDER_MOTOR_PIN, OUTPUT);
  pinMode(GATE_IN1, OUTPUT); pinMode(GATE_IN2, OUTPUT);
  pinMode(EXHAUST_FAN_PIN, OUTPUT); pinMode(LED_PIN, OUTPUT); pinMode(PUMP_PIN, OUTPUT);
  pinMode(BULB1_PIN, OUTPUT); pinMode(BULB2_PIN, OUTPUT);
  pinMode(LIMIT_CLOSED, INPUT_PULLUP); pinMode(LIMIT_OPEN, INPUT_PULLUP);
  pinMode(SOIL_PIN, INPUT);
  digitalWrite(FEEDER_MOTOR_PIN, LOW);
  digitalWrite(EXHAUST_FAN_PIN, LOW); digitalWrite(LED_PIN, LOW); digitalWrite(PUMP_PIN, LOW);
  digitalWrite(BULB1_PIN, LOW); digitalWrite(BULB2_PIN, LOW); stopGate();
  analogReadResolution(12);

  ESP32PWM::allocateTimer(0); ESP32PWM::allocateTimer(1);
  feederServo.setPeriodHertz(50);
  feederServo.attach(SERVO_PIN, 500, 2500);
  closeFeederServo();

  dht.begin();
  Wire.begin(OLED_SDA, OLED_SCL);
  oledReady = oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (oledReady) { oled.clearDisplay(); oled.setTextColor(SSD1306_WHITE); oled.display(); }
  else Serial.println("[OLED] Not detected; continuing without display.");

  // ESP32 RX=27, TX=19. Wire TX19 -> DFPlayer RX and DFPlayer TX -> RX27.
  dfSerial.begin(9600, SERIAL_8N1, DFPLAYER_RX_PIN, DFPLAYER_TX_PIN);
  delay(300);
  dfplayerReady = dfplayer.begin(dfSerial, true, true);
  if (dfplayerReady) { dfplayer.volume(22); Serial.println("[DFPlayer] Ready"); }
  else Serial.println("[DFPlayer] Not detected; audio disabled.");

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 12000) { delay(250); Serial.print('.'); }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) Serial.println("[WiFi] Connected");
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov"); // India Standard Time UTC+5:30

  // Firebase TLS is configured insecurely here for compatibility/testing.
  // For production, validate the server certificate instead of setInsecure().
  ssl_client1.setInsecure(); ssl_client2.setInsecure();
  initializeApp(async_client1, app, getAuth(user_auth), processFirebaseGeneral, "authTask");
  app.getApp<RealtimeDatabase>(Database);
  Database.url(DATABASE_URL);

  lastSensorReadMs = millis() - SENSOR_INTERVAL_MS;
  lastDisplayMs = millis();
  lastSensorSyncMs = millis();
  Serial.println("[SYSTEM] Ready");
}

void loop() {
  app.loop();
  uint32_t now = millis();

  if (WiFi.status() != WL_CONNECTED && now - lastWifiRetryMs >= 5000) {
    lastWifiRetryMs = now;
    Serial.println("[WiFi] Disconnected; attempting reconnect");
    WiFi.reconnect();
  }

  if (now - lastSensorReadMs >= SENSOR_INTERVAL_MS) {
    lastSensorReadMs = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) temperatureC = t;
    if (!isnan(h)) humidityPct = h;
    soilRaw = analogRead(SOIL_PIN);
  }

  if (now - lastDisplayMs >= DISPLAY_INTERVAL_MS) {
    lastDisplayMs = now;
    displayPage = (displayPage + 1) % 7;
    updateOLED();
  }

  if (now - lastSensorSyncMs >= SENSOR_SYNC_INTERVAL_MS) {
    lastSensorSyncMs = now;
    if (app.ready() && WiFi.status() == WL_CONNECTED) syncSensorsToFirebase();
  }

  // Sequential async reads, spaced to reduce overlapping/cancelled requests.
  if (app.ready() && WiFi.status() == WL_CONNECTED && now - lastFirebasePollMs >= FIREBASE_POLL_INTERVAL_MS) {
    lastFirebasePollMs = now;
    size_t i = firebaseReadIndex;
    firebaseReadIndex = (firebaseReadIndex + 1) % FIREBASE_READ_COUNT;
    Database.get(async_client2, firebasePaths[i], processFirebaseRead, false, firebaseUids[i]);
  }

  checkAutoSchedules();
  if (servoAutoRunning && now - servoRunStarted >= RUN_DURATION_MS) {
    closeFeederServo(); servoAutoRunning = false;
    if (app.ready() && WiFi.status() == WL_CONNECTED)
      Database.set<String>(async_client1, "/status/feeder_servo", "close", processFirebaseWrite, "status_servo_closed");
  }
  if (motorAutoRunning && now - motorRunStarted >= RUN_DURATION_MS) {
    feederMotorOff(); motorAutoRunning = false;
    if (app.ready() && WiFi.status() == WL_CONNECTED)
      Database.set<String>(async_client1, "/status/feeder_motor", "off", processFirebaseWrite, "status_motor_off");
  }
  applyGateMotion();
}

void processFirebaseRead(AsyncResult &result) {
  if (!result.isResult()) return;
  String uid = result.uid();
  if (result.isError()) {
    Serial.printf("[Firebase][GET][ERROR] %s: %s\n", uid.c_str(), result.error().message().c_str());
    return;
  }
  if (result.available()) {
    String value = result.c_str(); value.trim(); value.replace("\"", ""); value.toLowerCase();
    Serial.printf("[Firebase][GET] %s=%s\n", uid.c_str(), value.c_str());
    applyFirebaseValue(uid, value);
  }
}

void applyFirebaseValue(String uid, String value) {
  if (uid == "gate") {
    if ((value == "open" || value == "close" || value == "stop") && value != lastGateCommand) {
      lastGateCommand = value; gateCommand = value;
      if (value == "open") { digitalWrite(LED_PIN, HIGH); playMusicCommand("gate_open"); }
      else if (value == "close") playMusicCommand("gate_close");
      if (app.ready() && WiFi.status() == WL_CONNECTED)
        Database.set<String>(async_client1, "/status/gate", value, processFirebaseWrite, "status_gate");
    }
  } else if (uid == "servo_mode") {
    if (value == "auto" || value == "manual") servoMode = value;
  } else if (uid == "servo") {
    if (servoMode == "manual" && (value == "open" || value == "close") && value != lastServoCommand) {
      lastServoCommand = value;
      if (value == "open") { digitalWrite(LED_PIN, HIGH); openFeederServo(); playMusicCommand("servo_open"); }
      else { closeFeederServo(); playMusicCommand("servo_close"); }
      if (app.ready() && WiFi.status() == WL_CONNECTED)
        Database.set<String>(async_client1, "/status/feeder_servo", value, processFirebaseWrite, "status_servo");
    }
  } else if (uid == "motor_mode") {
    if (value == "auto" || value == "manual") motorMode = value;
  } else if (uid == "motor") {
    if (motorMode == "manual" && (value == "on" || value == "off") && value != lastMotorCommand) {
      lastMotorCommand = value;
      if (value == "on") feederMotorOn(); else feederMotorOff();
      if (app.ready() && WiFi.status() == WL_CONNECTED)
        Database.set<String>(async_client1, "/status/feeder_motor", value, processFirebaseWrite, "status_motor");
    }
  } else if (uid == "music") {
    if (value.length() && value != "null" && value != lastMusicCommand) {
      lastMusicCommand = value;
      playMusicCommand(value);
      // Reset command so the same command can be issued again from the app.
      if (app.ready() && WiFi.status() == WL_CONNECTED)
        Database.set<String>(async_client1, "/controls/music", "idle", processFirebaseWrite, "clear_music_command");
      lastMusicCommand = "idle";
    }
  } else if (uid == "fan") setOutput(EXHAUST_FAN_PIN, "/controls/exhaust_fan", value);
  else if (uid == "led") setOutput(LED_PIN, "/controls/led", value);
  else if (uid == "pump") setOutput(PUMP_PIN, "/controls/pump", value);
  else if (uid == "bulb1") setOutput(BULB1_PIN, "/controls/bulb1", value);
  else if (uid == "bulb2") setOutput(BULB2_PIN, "/controls/bulb2", value);
}

void setOutput(int pin, const char* path, String value) {
  if (value == "on" || value == "true" || value == "1") digitalWrite(pin, HIGH);
  else if (value == "off" || value == "false" || value == "0") digitalWrite(pin, LOW);
  else { if (value != "null" && value.length()) Serial.printf("[Firebase] Invalid value for %s: %s\n", path, value.c_str()); return; }
  Serial.printf("[OUTPUT] %s=%s\n", path, value.c_str());
}

void stopGate() { digitalWrite(GATE_IN1, LOW); digitalWrite(GATE_IN2, LOW); }
void applyGateMotion() {
  if (gateCommand == "open") {
    if (digitalRead(LIMIT_OPEN) == LOW) { stopGate(); gateCommand = "stop"; }
    else { digitalWrite(GATE_IN1, LOW); digitalWrite(GATE_IN2, HIGH); }
  } else if (gateCommand == "close") {
    if (digitalRead(LIMIT_CLOSED) == LOW) { stopGate(); gateCommand = "stop"; }
    else { digitalWrite(GATE_IN1, HIGH); digitalWrite(GATE_IN2, LOW); }
  } else stopGate();
}

void openFeederServo() {
  feederServo.write(SERVO_OPEN_ANGLE); servoCommand = "open";
  lastServoActionTime = getTimestamp();
}
void closeFeederServo() {
  feederServo.write(SERVO_CLOSED_ANGLE); servoCommand = "close";
  lastServoActionTime = getTimestamp();
}
void feederMotorOn() { digitalWrite(FEEDER_MOTOR_PIN, HIGH); motorCommand = "on"; lastMotorActionTime = getTimestamp(); }
void feederMotorOff() { digitalWrite(FEEDER_MOTOR_PIN, LOW); motorCommand = "off"; lastMotorActionTime = getTimestamp(); }

void checkAutoSchedules() {
  struct tm ti;
  if (!getLocalTime(&ti, 5)) return;
  timeReady = true;
  int dayKey = ti.tm_yday + ti.tm_year * 366;
  bool morning = (ti.tm_hour == 6 && ti.tm_min == 30);
  bool evening = (ti.tm_hour == 17 && ti.tm_min == 30);
  if (!morning && !evening) return;
  int scheduleKey = dayKey * 2 + (evening ? 1 : 0);
  if (servoMode == "auto" && lastServoScheduleDay != scheduleKey) {
    digitalWrite(LED_PIN, HIGH); openFeederServo(); playMusicCommand("servo_open");
    servoRunStarted = millis(); servoAutoRunning = true; lastServoScheduleDay = scheduleKey;
    if (app.ready() && WiFi.status() == WL_CONNECTED)
      Database.set<String>(async_client1, "/status/last_servo_run", getTimestamp(), processFirebaseWrite, "last_servo_run");
  }
  if (motorMode == "auto" && lastMotorScheduleDay != scheduleKey) {
    feederMotorOn(); motorRunStarted = millis(); motorAutoRunning = true; lastMotorScheduleDay = scheduleKey;
    if (app.ready() && WiFi.status() == WL_CONNECTED)
      Database.set<String>(async_client1, "/status/last_feeder_run", getTimestamp(), processFirebaseWrite, "last_feeder_run");
  }
}

void playMusicCommand(String command) {
  if (!dfplayerReady) { Serial.println("[DFPlayer] Not ready; audio command ignored"); return; }
  if (command == "stop") dfplayer.stop();
  else if (command == "next") dfplayer.next();
  else if (command == "previous") dfplayer.previous();
  else if (command == "folder") dfplayer.loopFolder(1);
  else if (command == "siren") dfplayer.play(1);       // 0001.mp3
  else if (command == "music") dfplayer.loopFolder(2); // /02/001.mp3 etc.
  else if (command == "gate_open") dfplayer.play(2);   // 0002.mp3
  else if (command == "gate_close") dfplayer.play(3);  // 0003.mp3
  else if (command == "servo_open") dfplayer.play(4);  // 0004.mp3
  else if (command == "servo_close") dfplayer.play(5); // 0005.mp3
  else {
    int track = command.toInt();
    if (track >= 1 && track <= 3000) dfplayer.play(track);
    else Serial.printf("[DFPlayer] Unknown command: %s\n", command.c_str());
  }
}

String getTimestamp() {
  struct tm ti;
  if (!getLocalTime(&ti, 5)) return String("time-unavailable");
  char buf[24]; strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &ti);
  return String(buf);
}

void syncSensorsToFirebase() {
  if (!app.ready() || WiFi.status() != WL_CONNECTED) return;
  String stamp = getTimestamp();
  if (!isnan(temperatureC)) Database.set<float>(async_client1, "/sensors/temperature_c", temperatureC, processFirebaseWrite, "sensor_temp");
  if (!isnan(humidityPct)) Database.set<float>(async_client1, "/sensors/humidity_pct", humidityPct, processFirebaseWrite, "sensor_humidity");
  Database.set<int>(async_client1, "/sensors/soil_raw", soilRaw, processFirebaseWrite, "sensor_soil");
  Database.set<String>(async_client1, "/sensors/soil_status", soilRaw > SOIL_DRY_THRESHOLD ? "dry" : "wet", processFirebaseWrite, "sensor_soil_status");
  Database.set<String>(async_client1, "/sensors/last_update", stamp, processFirebaseWrite, "sensor_last_update");
  lastSensorSyncTime = stamp;
}

void processFirebaseWrite(AsyncResult &result) {
  if (!result.isResult()) return;
  if (result.isError()) Serial.printf("[Firebase][WRITE][ERROR] %s: %s\n", result.uid().c_str(), result.error().message().c_str());
  else if (result.available()) Serial.printf("[Firebase][WRITE][OK] %s\n", result.uid().c_str());
}
void processFirebaseGeneral(AsyncResult &result) {
  if (result.isError()) Serial.printf("[Firebase][ERROR] %s: %s\n", result.uid().c_str(), result.error().message().c_str());
  if (result.isEvent()) Serial.printf("[Firebase][EVENT] %s\n", result.eventLog().message().c_str());
}

void updateOLED() {
  if (!oledReady) return;
  oled.clearDisplay(); oled.setTextColor(SSD1306_WHITE); oled.setTextWrap(false);
  struct tm ti; bool haveTime = getLocalTime(&ti, 5);
  char timeBuf[16] = "--:--:--", dateBuf[16] = "--/--/----";
  if (haveTime) { strftime(timeBuf, sizeof(timeBuf), "%H:%M:%S", &ti); strftime(dateBuf, sizeof(dateBuf), "%d-%m-%Y", &ti); }
  oled.setTextSize(1); oled.setCursor(0,0);
  switch (displayPage) {
    case 0:
      oled.println("WEATHER / DHT22"); oled.drawLine(0,10,127,10,SSD1306_WHITE);
      oled.setTextSize(2); oled.setCursor(0,18); oled.print("T "); if (isnan(temperatureC)) oled.print("--.-"); else oled.print(temperatureC,1); oled.println("C");
      oled.setCursor(0,43); oled.print("H "); if (isnan(humidityPct)) oled.print("--"); else oled.print(humidityPct,0); oled.println("%"); break;
    case 1:
      oled.println("SOIL MOISTURE"); oled.drawLine(0,10,127,10,SSD1306_WHITE); oled.setTextSize(2); oled.setCursor(0,18); oled.println(soilRaw);
      oled.setTextSize(1); oled.setCursor(0,48); oled.println(soilRaw > SOIL_DRY_THRESHOLD ? "Status: DRY (raw)" : "Status: WET (raw)"); break;
    case 2:
      oled.println("DATE / TIME"); oled.drawLine(0,10,127,10,SSD1306_WHITE); oled.setTextSize(2); oled.setCursor(0,20); oled.println(timeBuf); oled.setTextSize(1); oled.setCursor(0,48); oled.println(dateBuf); break;
    case 3:
      oled.println("FEEDER SERVO"); oled.drawLine(0,10,127,10,SSD1306_WHITE); oled.setTextSize(2); oled.setCursor(0,18); oled.println(servoCommand);
      oled.setTextSize(1); oled.setCursor(0,42); oled.print("Mode: "); oled.println(servoMode); oled.setCursor(0,54); oled.print("Last: "); oled.println(lastServoActionTime); break;
    case 4:
      oled.println("FEEDER MOTOR"); oled.drawLine(0,10,127,10,SSD1306_WHITE); oled.setTextSize(2); oled.setCursor(0,18); oled.println(motorCommand);
      oled.setTextSize(1); oled.setCursor(0,42); oled.print("Mode: "); oled.println(motorMode); oled.setCursor(0,54); oled.print("Last: "); oled.println(lastMotorActionTime); break;
    case 5:
      oled.println("GATE / NETWORK"); oled.drawLine(0,10,127,10,SSD1306_WHITE); oled.setTextSize(2); oled.setCursor(0,16); oled.println(gateCommand);
      oled.setTextSize(1); oled.setCursor(0,42); oled.print("WiFi: "); oled.println(WiFi.status()==WL_CONNECTED ? "CONNECTED" : "OFFLINE"); oled.setCursor(0,54); oled.print("Firebase: "); oled.println(app.ready() ? "READY" : "WAITING"); break;
    case 6:
      oled.println("SENSOR SYNC"); oled.drawLine(0,10,127,10,SSD1306_WHITE); oled.setCursor(0,18); oled.print("Last sync:"); oled.setCursor(0,30); oled.println(lastSensorSyncTime);
      oled.setCursor(0,44); oled.print("Date: "); oled.println(dateBuf); oled.setCursor(0,56); oled.print("Time: "); oled.println(timeBuf); break;
  }
  oled.display();
}
