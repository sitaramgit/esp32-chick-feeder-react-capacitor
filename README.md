# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm run build:web`
### `npm run deploy`

above 2 commands, to deploy on github pages



### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

### WebRTC ICE Servers Configuration (STUN + TURN)

This project uses **WebRTC** for real-time peer-to-peer video streaming.  
To handle connections across **NATs**, firewalls, and symmetric networks (very common on mobile/4G/5G/office Wi-Fi), we configure **STUN** and **TURN** servers.

#### rtcConfig (in `utils/webrtc.ts` or similar)

**What is STUN and TURN? (Quick Explanation)**

STUN (Session Traversal Utilities for NAT)

→ Helps each peer discover its public IP and port.

→ Very lightweight — no media goes through the server.

→ Works for ~80% of connections.
TURN (Traversal Using Relays around NAT)

→ Acts as a relay server when direct P2P is impossible (symmetric NAT, strict firewall, UDP blocked, etc.).

→ All audio/video/data is relayed through the TURN server 
→ ensures connection but uses more bandwidth and adds ~30–100 ms latency.

→ ~15–30% of real-world WebRTC connections need TURN (higher in mobile/enterprise networks).

### Why we use Turnix.io

* Globally distributed infrastructure (low latency relays)
* Supports both UDP and TCP (and TLS via turns:)
* Reliable for production WebRTC apps (video calls, live streaming, IoT remote viewing)
* Credentials are long-term (but rotate them periodically for security in production)


**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
