#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include <time.h>

// ==================== GATE MOTOR PINS ====================
#define IN1 16  // RX2
#define IN2 17  // TX2
#define LIMIT_MIN 32
#define LIMIT_MAX 33

// ==================== FIREBASE ====================
UserAuth user_auth("AIzaSyDe8Jbt1lxmVLPHr65ZucM--qIFE4D_v_s", "sitaramkdks@gmail.com", "Sitaram$0279");

FirebaseApp app;
WiFiClientSecure ssl_client1, ssl_client2;

using AsyncClient = AsyncClientClass;
AsyncClient async_client1(ssl_client1), async_client2(ssl_client2);

RealtimeDatabase Database;
AsyncResult dbResult;

unsigned long lastWifiCheck = 0;
const unsigned long wifiCheckInterval = 5000;

String currentGateState = "stop";  // "open", "close", "stop"
String lastFirebaseCommand = "";
// ==================== MOTOR FUNCTIONS ====================
void motorOpen() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
}

void motorClose() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
}

void motorStop() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
}

void applyGateState() {

  int minLimit = digitalRead(LIMIT_MIN);
  int maxLimit = digitalRead(LIMIT_MAX);

  Serial.print("MIN=");
  Serial.print(minLimit);
  Serial.print("  MAX=");
  Serial.print(maxLimit);
  Serial.print("  STATE=");
  Serial.println(currentGateState);

  if (currentGateState == "open") {

    if (maxLimit == LOW) {

      motorStop();
      currentGateState = "stop";

      Serial.println(">>> MAX LIMIT PRESSED → MOTOR STOPPED");

    } else {

      motorOpen();
    }
  }

  else if (currentGateState == "close") {

    if (minLimit == LOW) {

      motorStop();
      currentGateState = "stop";

      Serial.println(">>> MIN LIMIT PRESSED → MOTOR STOPPED");

    } else {

      motorClose();
    }
  }

  else {

    motorStop();
  }

  delay(100);
}

void processData(AsyncResult &aResult) {
  if (!aResult.isResult()) return;

  if (aResult.isEvent())
    Firebase.printf("Event: %s, msg: %s\n", aResult.uid().c_str(), aResult.eventLog().message().c_str());

  if (aResult.isError())
    Firebase.printf("Error: %s, code: %d\n", aResult.error().message().c_str(), aResult.error().code());

  if (aResult.available())
    Firebase.printf("Task: %s → %s\n", aResult.uid().c_str(), aResult.c_str());
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(LIMIT_MIN, INPUT_PULLUP);
  pinMode(LIMIT_MAX, INPUT_PULLUP);
  motorStop();

  Serial.print("Connecting to Wi-Fi");
  WiFi.begin("Siggundali", "sitaram123");

  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 60000) {
    Serial.print(".");
    delay(500);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Connected with IP: ");
    Serial.println(WiFi.localIP());
    configTime(19800, 0, "pool.ntp.org");
  } else {
    Serial.println("WiFi connection timed out.");
  }

  ssl_client1.setInsecure();
  ssl_client2.setInsecure();
  ssl_client1.setConnectionTimeout(1000);
  ssl_client1.setHandshakeTimeout(5);
  ssl_client2.setConnectionTimeout(1000);
  ssl_client2.setHandshakeTimeout(5);

  initializeApp(async_client1, app, getAuth(user_auth), processData, "authTask");
  app.getApp<RealtimeDatabase>(Database);
  Database.url("https://iot-testing-68711-default-rtdb.firebaseio.com");

  Serial.println("Setup Complete");
}

// ==================== LOOP ====================
void loop() {

  // =========================
  // WIFI RECONNECT
  // =========================
  if (millis() - lastWifiCheck > wifiCheckInterval) {
    lastWifiCheck = millis();

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi reconnecting...");
      WiFi.disconnect();
      WiFi.begin("Siggundali", "sitaram123");
    }
  }

  // Firebase background processing
  app.loop();


  // =========================
  // FIREBASE COMMAND
  // =========================
  if (app.ready()) {

    String gateCommand = Database.get<String>(
      async_client2,
      "/controls/gate"
    );

    if (async_client2.lastError().code() == 0) {

      gateCommand.toLowerCase();
      gateCommand.trim();

      if (gateCommand == "open" ||
          gateCommand == "close" ||
          gateCommand == "stop") {

        if (gateCommand != lastFirebaseCommand) {

          lastFirebaseCommand = gateCommand;

          currentGateState = gateCommand;

          Serial.print("New Gate Command → ");
          Serial.println(currentGateState);
        }
      }
    }
  }


  // =========================
  // MOTOR + LIMIT SWITCH
  // =========================
  // IMPORTANT:
  // This MUST be outside app.ready()
  applyGateState();


  processData(dbResult);
}