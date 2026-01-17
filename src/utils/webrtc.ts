export const rtcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.turnix.io:3478"]
    },
    {
      username: "dbaf50c2-580d-4876-bbe5-a2b80b6e5092",
      credential: "fbf6b3125500b96f1e6f6c821f739cac",
      urls: [
        "turn:eu-central.turnix.io:3478?transport=udp",
        "turn:eu-central.turnix.io:3478?transport=tcp",
        "turns:eu-central.turnix.io:443?transport=udp",
        "turns:eu-central.turnix.io:443?transport=tcp"
      ]
    }
  ],
  iceCandidatePoolSize: 10,  // optional but recommended
  // iceTransportPolicy: "relay"   // ← only uncomment for strict testing (forces TURN always)
};