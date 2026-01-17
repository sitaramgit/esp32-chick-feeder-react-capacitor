#define ENABLE_USER_AUTH
#define ENABLE_DATABASE


#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <DHT_U.h>
#include <time.h>

// Display configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1  // Reset not used for I2C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);


// DHT sensor configuration
#define DHTPIN 15
#define DHTTYPE DHT11  // Change to DHT22 if you use DHT22
DHT dht(DHTPIN, DHTTYPE);


// Moisture sensor configuration
#define MOISTURE_PIN 34  // Analog pin for moisture sensor


#define BUZZER_PIN 5
#define LED_PIN 2
// Step 2
void asyncCB(AsyncResult &aResult);
void processData(AsyncResult &aResult);


// Step 3
UserAuth user_auth("AIzaSyDe8Jbt1lxmVLPHr65ZucM--qIFE4D_v_s", "sitaramkdks@gmail.com", "Sitaram$0279");


// Step 4
FirebaseApp app;


// Step 5
// Use two SSL clients for sync and async tasks for demonstation only.
WiFiClientSecure ssl_client1, ssl_client2;


// Step 6
// Use two AsyncClients for sync and async tasks for demonstation only.
using AsyncClient = AsyncClientClass;
AsyncClient async_client1(ssl_client1), async_client2(ssl_client2);


// Step 7
RealtimeDatabase Database;


bool onetimeTest = false;


// The Optional proxy object that provides the data/information
//  when used in async mode without callback.
AsyncResult dbResult;


void setup() {
  Serial.begin(115200);


  WiFi.begin("FTTH-89B3", "12345678");


  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  configTime(19800, 0, "pool.ntp.org"); // IST = +5:30
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();


  // The SSL client options depend on the SSL client used.


  // Initialize display
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {  // I2C address is usually 0x3C
    Serial.println(F("SSD1306 allocation failed"));
    while (true)
      ;
  }


  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 10);
  display.println("Temperature Initialize...");
  display.display();






  // Skip certificate verification
  ssl_client1.setInsecure();
  ssl_client2.setInsecure();


  // Set timeout
  ssl_client1.setConnectionTimeout(1000);
  ssl_client1.setHandshakeTimeout(5);
  ssl_client2.setConnectionTimeout(1000);
  ssl_client2.setHandshakeTimeout(5);


  // ESP8266 Set buffer size
  // ssl_client1.setBufferSizes(4096, 1024);
  // ssl_client2.setBufferSizes(4096, 1024);


  // Step 8
  initializeApp(async_client1, app, getAuth(user_auth), processData, "🔐 authTask");


  // Step 9
  app.getApp<RealtimeDatabase>(Database);


  // Step 10
  Database.url("https://iot-testing-68711-default-rtdb.firebaseio.com");
  dht.begin();
}


unsigned long lastSend = 0;
const unsigned long interval = 300000; // 5 minutes

long getTimestamp() {
  time_t now;
  time(&now);
  return now;
}

void loop() {
  // Step 11
  app.loop();


  // Step 12
  // if (app.ready() && !onetimeTest) {
  if (app.ready()) {
    onetimeTest = true;


    // Every 5 seconds send sensor data
    if (millis() - lastSend >= interval) {
      lastSend = millis();


      float temp = dht.readTemperature();
      float hum = dht.readHumidity();
      int moistureRaw = analogRead(MOISTURE_PIN);
      // Convert raw moisture value to percentage (approximate scaling)
      int moisturePercent = map(moistureRaw, 4095, 0, 0, 100);


      if (!isnan(temp) && !isnan(hum)) {
        Database.set<float>(async_client1, "/sensor/temperature", temp, processData, "temp");
        Database.set<float>(async_client1, "/sensor/humidity", hum, processData, "humidity");
        Database.set<float>(async_client1, "/sensor/moisture", moisturePercent, processData, "moisturePercentage");

        long ts = getTimestamp();

        String basePath = "/chick_form/readings/" + String(ts);

        Database.set<float>(async_client1, basePath + "/temperature", temp, processData, "temp");
        Database.set<int>(async_client1, basePath + "/humidity", hum, processData, "humidity");
      }
      // Log to Serial Monitor
      Serial.print("Temperature: ");
      Serial.print(temp);
      Serial.print(" *C, Humidity: ");
      Serial.print(hum);
      Serial.print(" %, Moisture: ");
      Serial.print(moisturePercent);
      Serial.println(" %");
      Serial.println(" %");

    }


    // Read LED control from Firebase
    bool ledControl = Database.get<bool>(async_client2, "/controls/led");
    if (async_client2.lastError().code() == 0) {
      digitalWrite(LED_PIN, ledControl ? HIGH : LOW);
    }



    // if (async_client2.lastError().code() == 0) {
    //   Serial.println("Value get complete.");
    //   Serial.println(value);
    // } else
    //   Firebase.printf("Error, msg: %s, code: %d\n", async_client2.lastError().message().c_str(), async_client2.lastError().code());
  }


  // Step 13
  processData(dbResult);
}



void processData(AsyncResult &aResult) {
  // Exits when no result available when calling from the loop.
  if (!aResult.isResult())
    return;


  if (aResult.isEvent())
    Firebase.printf("Event task: %s, msg: %s, code: %d\n", aResult.uid().c_str(), aResult.eventLog().message().c_str(), aResult.eventLog().code());


  if (aResult.isDebug())
    Firebase.printf("Debug task: %s, msg: %s\n", aResult.uid().c_str(), aResult.debug().c_str());


  if (aResult.isError())
    Firebase.printf("Error task: %s, msg: %s, code: %d\n", aResult.uid().c_str(), aResult.error().message().c_str(), aResult.error().code());


  if (aResult.available())
    Firebase.printf("task: %s, payload: %s\n", aResult.uid().c_str(), aResult.c_str());


   // ✅ LED Control: Check if this is the LED task
     if (aResult.available()) {
    Serial.printf("Task: %s, Payload: %s\n", aResult.uid().c_str(), aResult.c_str());




    if (aResult.uid() == "LED_Control_Task") {
      String ledValue = aResult.c_str();
      bool ledState = (ledValue == "true" || ledValue == "1");


      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
      Serial.println(ledState ? "✅ LED ON" : "✅ LED OFF");
    }


}
}

