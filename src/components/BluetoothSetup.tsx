
import React, { useEffect, useState } from 'react';
import { BleClient, textToDataView } from '@capacitor-community/bluetooth-le';

const SERVICE_UUID = '91bad492-b950-4226-aa2b-4ede9fa42f59';
const CHARACTERISTIC_UUID = 'cba1d466-344c-4be3-ab3f-189f80dd7518';
//https://grok.com/share/bGVnYWN5_e20b43d5-c951-4701-bc0d-abc4b4a4c69f
const BluetoothSetup = ({firebaseCMD}:{firebaseCMD?: string}) => {
  const [devices, setDevices] = useState<any>([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState(null);
  const [receivedData, setReceivedData] = useState('');
  const [messageToSend, setMessageToSend] = useState('');
const [status, setStatus] = useState('Ready');

    useEffect(() => {
        setMessageToSend(firebaseCMD as string)
        if (firebaseCMD !== '') {
            sendData()
        }

    }, [firebaseCMD])

  // Step 1: Initialize and scan for devices
const scanForDevices = async () => {
  setDevices([]);
  setStatus('Initializing BLE...');

  try {
    // Step 1: ALWAYS initialize first (required!)
    await BleClient.initialize({
      androidNeverForLocation: true, // skips location permission on Android 12+
    });
    console.log('BLE plugin initialized successfully');

    setStatus('BLE initialized → checking Bluetooth state...');

    // Step 2: Now safe to check/enable Bluetooth
    let isEnabled = await BleClient.isEnabled();
    if (!isEnabled) {
      console.log('Bluetooth is off → requesting enable');
      await BleClient.enable(); // This prompts the user if needed
      // Re-check after enable (user might have denied)
      isEnabled = await BleClient.isEnabled();
      if (!isEnabled) {
        setStatus('Bluetooth enable failed or denied. Please turn it on manually.');
        return;
      }
      setStatus('Bluetooth enabled → Scanning all BLE devices (30 seconds)...');
    } else {
      setStatus('Scanning all BLE devices (30 seconds)...');
    }

    // Step 3: Start scan with NO filter
    await BleClient.requestLEScan(
      {}, // Empty = detect ALL BLE devices
      (result) => {
        console.log('FULL SCAN RESULT:', JSON.stringify(result, null, 2));
        const dev = result.device;
        const name = dev.name || 'No name';
        const id = dev.deviceId;

        console.log(`Detected → Name: ${name} | ID: ${id} | RSSI: ${result.rssi || 'N/A'}`);

        // Add to list (show everything for debug)
        if (!devices.find((d: any) => d.deviceId === id)) {
          setDevices((prev: any) => [...prev, { ...dev, rssi: result.rssi }]);
        }

        setStatus(`Found: ${name} (${id.slice(0, 8)}...) RSSI ${result.rssi || 'N/A'}`);
      }
    );

    // Auto-stop after 30s
    setTimeout(async () => {
      await BleClient.stopLEScan();
      if (devices.length === 0) {
        setStatus(
          'Scan finished – ZERO devices detected.\n\n' +
          'Possible reasons:\n' +
          '1. ESP32 not advertising (check Serial Monitor: should say "Waiting for connection...")\n' +
          '2. Phone Bluetooth is ON but BLE scan blocked (toggle Airplane mode)\n' +
          '3. Device too far / interference\n' +
          '4. Run logcat to see if scan really starts\n\n' +
          'Next: Share logcat output or try another BLE device (e.g. smartwatch)'
        );
      } else {
        setStatus(`Scan complete – ${devices.length} device(s) found`);
      }
    }, 30000);

  } catch (error: any) {
    console.error('BLE operation failed:', error);
    const msg = error.message || 'Unknown error';
    if (msg.includes('not initialized')) {
      setStatus('Initialization failed – plugin may not be registered. Rebuild app.');
    } else if (msg.includes('unsupported') || msg.includes('unavailable')) {
      setStatus('BLE hardware not supported or disabled on this device.');
    } else {
      setStatus(`Error: ${msg}`);
    }
  }
};

  // Step 2: Connect to a device
  const connectToDevice = async (deviceId: any) => {
    try {
      await BleClient.connect(deviceId, () => console.log('Disconnected'));
      setConnectedDeviceId(deviceId);
      startNotifications(deviceId); // Start listening for data from ESP32
    } catch (error) {
      console.error('Connect error:', error);
    }
  };

  // Step 3: Start receiving data (notifications)
  const startNotifications = async (deviceId: any) => {
    try {
      await BleClient.startNotifications(
        deviceId,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (value) => {
          const decoder = new TextDecoder();
          setReceivedData(decoder.decode(value));
          console.log('Received from ESP32:', decoder.decode(value));
        }
      );
    } catch (error) {
      console.error('Notifications error:', error);
    }
  };

  // Step 4: Send data to ESP32 (write)
  const sendData = async () => {
    if (!connectedDeviceId || !messageToSend) return;
    try {
      await BleClient.write(
        connectedDeviceId,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        textToDataView(messageToSend)
      );
      console.log('Sent to ESP32:', messageToSend);
      setMessageToSend('');
    } catch (error) {
      console.error('Write error:', error);
    }
  };

  // Stop notifications and disconnect (optional cleanup)
  const disconnect = async () => {
    if (!connectedDeviceId) return;
    try {
      await BleClient.stopNotifications(connectedDeviceId, SERVICE_UUID, CHARACTERISTIC_UUID);
      await BleClient.disconnect(connectedDeviceId);
      setConnectedDeviceId(null);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  return (
    <div>
       <p><strong>Status:</strong> {status}</p>   {/* ← shows feedback */}
      <button onClick={scanForDevices} disabled={status.includes('Scanning')}>Scan for ESP32</button>

      <ul>
        {devices.map((device: any) => (
          <li key={device.deviceId}>
            {device.name || 'Unknown'} ({device.deviceId.slice(0,8)}...)
            <button onClick={() => connectToDevice(device.deviceId)}>Connect</button>
          </li>
        ))}
      </ul>
      {connectedDeviceId && (
        <>
          <input
            type="text"
            value={messageToSend}
            onChange={e => setMessageToSend(e.target.value)}
            placeholder="Message to send"
          />
          <button onClick={sendData}>Send to ESP32</button>
          <p>Received: {receivedData}</p>
          <button onClick={disconnect}>Disconnect</button>
        </>
      )}
    </div>
  );
}

export default BluetoothSetup;