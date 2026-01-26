
# Connecting React + Capacitor App to ESP32 via BLE  
(Bidirectional Data Transfer: Send/Receive Messages)

**Date of working setup:** January 2025  
**Tested on:** Android real device (Capacitor 8.x), ESP32 (Arduino IDE)  
**Plugin used:** `@capacitor-community/bluetooth-le@8.0.0`

## Overview

This guide explains how to:
- Make an ESP32 act as a BLE server (advertises, accepts connections, supports write + notify)
- Build a React + Capacitor mobile app that scans, connects, sends data (write), and receives data (notifications)

**Communication flow:**
- App → ESP32: Write string to characteristic
- ESP32 → App: Notify string periodically

## Prerequisites

- **Hardware:** ESP32 board (DevKitC, etc.)
- **Software:**
  - Arduino IDE + ESP32 board support
  - Node.js 18+
  - React app created with `create-react-app`
  - Capacitor 8.x installed
- **Permissions (Android):**
  - Nearby devices / Bluetooth
  - Location (sometimes still needed on older Android versions)

## Part 1: ESP32 Firmware (BLE Server)

### 1.1 Install Libraries
In Arduino IDE → Sketch → Include Library → Manage Libraries:
- Search and install: **ESP32 BLE Arduino** (comes with ESP32 core)

### 1.2 Full Working Sketch

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// === CHANGE THESE IF YOU WANT ===
#define DEVICE_NAME         "ESP32-Feeder"
#define SERVICE_UUID        "91bad492-b950-4226-aa2b-4ede9fa42f59"
#define CHARACTERISTIC_UUID "cba1d466-344c-4be3-ab3f-189f80dd7518"

BLECharacteristic *pCharacteristic;
bool deviceConnected = false;

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("Device connected");
    }
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("Device disconnected");
      BLEDevice::startAdvertising();  // Restart advertising
    }
};

class MyCharCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pChar) {
      std::string value = pChar->getValue();
      if (value.length() > 0) {
        Serial.print("Received: ");
        for (size_t i = 0; i < value.length(); i++) {
          Serial.print(value[i]);
        }
        Serial.println();
      }
    }
};

void setup() {
  Serial.begin(115200);
  Serial.println("Starting BLE...");

  BLEDevice::init(DEVICE_NAME);

  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );

  pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setCallbacks(new MyCharCallbacks());

  pService->start();

  // Better advertising settings for Android visibility
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);

  BLEDevice::startAdvertising();
  Serial.println("Advertising started → Waiting for connection...");
}

void loop() {
  if (deviceConnected) {
    static unsigned long lastSend = 0;
    if (millis() - lastSend > 5000) {  // every 5 seconds
      String msg = "Hello from ESP32";
      pCharacteristic->setValue(msg.c_str());
      pCharacteristic->notify();
      Serial.println("Sent: " + msg);
      lastSend = millis();
    }
  }
  delay(100);
}
```

Upload → Open Serial Monitor (115200 baud)  
Expected output: `Advertising started → Waiting for connection...`

## Part 2: React + Capacitor App (BLE Client)

### 2.1 Install Plugin

```bash
npm install @capacitor-community/bluetooth-le
npx cap sync
```

### 2.2 Android Permissions (android/app/src/main/AndroidManifest.xml)

Add inside `<manifest>` (outside `<application>`):

```xml
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30" />
```

### 2.3 variables.gradle (android/variables.gradle)

Recommended (Capacitor 8.x):

```groovy
ext {
    minSdkVersion = 24
    compileSdkVersion = 36
    targetSdkVersion = 36
    // ... other lines
}
```

### 2.4 React Component (BluetoothSetup.tsx)

```tsx
import React, { useState, useEffect } from 'react';
import { BleClient, textToDataView } from '@capacitor-community/bluetooth-le';

const SERVICE_UUID = '91bad492-b950-4226-aa2b-4ede9fa42f59';
const CHARACTERISTIC_UUID = 'cba1d466-344c-4be3-ab3f-189f80dd7518';

export default function BluetoothSetup() {
  const [status, setStatus] = useState('Ready');
  const [devices, setDevices] = useState<any[]>([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [receivedData, setReceivedData] = useState('');
  const [messageToSend, setMessageToSend] = useState('');

  // Initialize BLE once on mount
  useEffect(() => {
    const initBLE = async () => {
      try {
        await BleClient.initialize({ androidNeverForLocation: true });
        console.log('BLE plugin initialized');
        setStatus('BLE ready');
      } catch (err: any) {
        console.error('BLE init failed', err);
        setStatus(`Init failed: ${err.message}`);
      }
    };
    initBLE();
  }, []);

  const scanForDevices = async () => {
    setDevices([]);
    setStatus('Scanning all BLE devices (30s)...');

    try {
      await BleClient.requestLEScan(
        {}, // No filter – very important for ESP32
        (result) => {
          const dev = result.device;
          const name = dev.name || 'Unknown';
          console.log(`Found: ${name} (${dev.deviceId}) RSSI: ${result.rssi}`);

          if (!devices.find(d => d.deviceId === dev.deviceId)) {
            setDevices(prev => [...prev, dev]);
          }
        }
      );

      setTimeout(async () => {
        await BleClient.stopLEScan();
        setStatus(devices.length > 0 ? `Found ${devices.length} device(s)` : 'No devices found');
      }, 30000);
    } catch (err: any) {
      setStatus(`Scan error: ${err.message}`);
    }
  };

  const connectToDevice = async (deviceId: string) => {
    try {
      await BleClient.connect(deviceId, () => {
        console.log('Disconnected');
        setConnectedDeviceId(null);
      });

      setConnectedDeviceId(deviceId);
      setStatus('Connected! Starting notifications...');

      // Start receiving notifications
      await BleClient.startNotifications(
        deviceId,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (value) => {
          const text = new TextDecoder().decode(value);
          setReceivedData(text);
          console.log('Received:', text);
        }
      );
    } catch (err: any) {
      setStatus(`Connect failed: ${err.message}`);
    }
  };

  const sendData = async () => {
    if (!connectedDeviceId || !messageToSend) return;
    try {
      await BleClient.write(
        connectedDeviceId,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        textToDataView(messageToSend)
      );
      console.log('Sent:', messageToSend);
      setMessageToSend('');
    } catch (err: any) {
      setStatus(`Send failed: ${err.message}`);
    }
  };

  const disconnect = async () => {
    if (!connectedDeviceId) return;
    try {
      await BleClient.stopNotifications(connectedDeviceId, SERVICE_UUID, CHARACTERISTIC_UUID);
      await BleClient.disconnect(connectedDeviceId);
      setConnectedDeviceId(null);
      setStatus('Disconnected');
    } catch (err: any) {
      setStatus(`Disconnect failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2>ESP32 BLE Control</h2>
      <p><strong>Status:</strong> {status}</p>

      <button onClick={scanForDevices} disabled={status.includes('Scanning')}>
        Scan for Devices
      </button>

      <ul>
        {devices.map(dev => (
          <li key={dev.deviceId}>
            {dev.name || 'Unknown'} ({dev.deviceId})
            <button onClick={() => connectToDevice(dev.deviceId)}>Connect</button>
          </li>
        ))}
      </ul>

      {connectedDeviceId && (
        <div>
          <input
            type="text"
            value={messageToSend}
            onChange={e => setMessageToSend(e.target.value)}
            placeholder="Type message..."
          />
          <button onClick={sendData}>Send to ESP32</button>

          <p><strong>Received from ESP32:</strong> {receivedData || '(waiting...)'}</p>

          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

## Troubleshooting Checklist (When It Doesn't Work)

1. ESP32 Serial Monitor shows "Advertising started..."?
2. Phone Bluetooth is ON?
3. App has Nearby devices permission?
4. Phone close to ESP32 (< 2 meters)?
5. Tried toggling Airplane mode → Bluetooth?
6. No service UUID in scan filter (use `{}`)?
7. `BleClient.initialize()` called before any BLE action?
8. Logcat shows scan starting but no results? → advertising issue

## Final Test Steps

1. Upload ESP32 code → see "Waiting for connection..." in Serial
2. Build & run app on real Android phone
3. Click "Scan for Devices" → should see "ESP32-Feeder"
4. Click Connect → status "Connected!"
5. Wait 5 seconds → see "Hello from ESP32" appear
6. Type message → click Send → see it in Serial Monitor

Congratulations — you're now fully connected!

Feel free to customize UUIDs, message format (JSON, etc.), add error recovery, or multiple characteristics.

Happy coding, Sitaram! 🐔✨
