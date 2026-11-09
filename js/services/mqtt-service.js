/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Ultra-Fast Native MQTT-over-WebSocket Realtime Mesh Relay
 * Pure Vanilla JS - Zero dependencies, zero API keys, zero rate-limits.
 * High-speed broadcast across all devices, mobile phones, and Wi-Fi networks in Indonesia & globally.
 */

class MqttRelayService {
  constructor() {
    this.brokers = [
      'wss://broker.emqx.io:8084/mqtt',
      'wss://broker.hivemq.com:8884/mqtt'
    ];
    this.brokerIndex = 0;
    this.ws = null;
    this.connected = false;
    this.subscribers = new Map(); // topic -> Set of callbacks
    this.lastMessages = new Map(); // topic -> last received message payload
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
    this.queuedPublishes = [];

    this.connect();
  }

  encodeRemLen(len) {
    const bytes = [];
    do {
      let d = len % 128;
      len = Math.floor(len / 128);
      if (len > 0) d |= 0x80;
      bytes.push(d);
    } while (len > 0);
    return bytes;
  }

  decodeRemLen(buf, startOffset) {
    let multiplier = 1;
    let value = 0;
    let offset = startOffset;
    let encodedByte;
    do {
      if (offset >= buf.length) break;
      encodedByte = buf[offset++];
      value += (encodedByte & 127) * multiplier;
      multiplier *= 128;
    } while ((encodedByte & 128) !== 0);
    return { length: value, nextOffset: offset };
  }

  connect() {
    if (typeof WebSocket === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const brokerUrl = this.brokers[this.brokerIndex];
    try {
      // Connect to MQTT Broker over WebSocket
      // On some platforms (like iOS Safari), subprotocol specification might be strict or rejected
      try {
        this.ws = new WebSocket(brokerUrl, ['mqtt']);
      } catch (e1) {
        this.ws = new WebSocket(brokerUrl);
      }
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        try {
          const cidStr = 'tc_' + Math.random().toString(36).substring(2, 10);
          const cidBytes = this.encoder.encode(cidStr);
          const varHeader = [0, 4, 77, 81, 84, 84, 4, 2, 0, 60]; // MQTT 3.1.1
          const payload = [0, cidBytes.length, ...cidBytes];
          const remLen = varHeader.length + payload.length;

          const packet = new Uint8Array([0x10, ...this.encodeRemLen(remLen), ...varHeader, ...payload]);
          this.ws.send(packet);
        } catch (err) {}
      };

      this.ws.onmessage = (event) => {
        try {
          const buf = new Uint8Array(event.data);
          if (buf.length === 0) return;
          const packetType = buf[0] >> 4;

          if (packetType === 2) {
            // CONNACK
            this.connected = true;
            this.startPing();

            for (const topic of this.subscribers.keys()) {
              this._sendSubscribe(topic);
            }

            while (this.queuedPublishes.length > 0) {
              const q = this.queuedPublishes.shift();
              this.publish(q.topic, q.data, q.retain);
            }
          } else if (packetType === 3) {
            // PUBLISH
            const { nextOffset } = this.decodeRemLen(buf, 1);
            let offset = nextOffset;
            const topicLen = (buf[offset] << 8) | buf[offset + 1];
            offset += 2;
            const topic = this.decoder.decode(buf.slice(offset, offset + topicLen));
            offset += topicLen;

            // Skip 2-byte Packet Identifier if QoS > 0
            const qos = (buf[0] >> 1) & 0x03;
            if (qos > 0) {
              offset += 2;
            }

            const payloadStr = this.decoder.decode(buf.slice(offset));

            let parsedData = payloadStr;
            try {
              parsedData = JSON.parse(payloadStr);
            } catch (e) {}

            this.lastMessages.set(topic, parsedData);

            if (this.subscribers.has(topic)) {
              this.subscribers.get(topic).forEach((cb) => {
                try {
                  cb(parsedData);
                } catch (err) {}
              });
            }
          }
        } catch (e) {}
      };

      this.ws.onerror = () => {
        this.connected = false;
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.stopPing();
        this.brokerIndex = (this.brokerIndex + 1) % this.brokers.length;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 2500);
      };
    } catch (err) {
      this.connected = false;
    }
  }

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(new Uint8Array([0xc0, 0x00]));
        } catch (e) {}
      }
    }, 25000);
  }

  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  _sendSubscribe(topic) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const tBytes = this.encoder.encode(topic);
      const payload = [0, 1, 0, tBytes.length, ...tBytes, 0];
      const packet = new Uint8Array([0x82, ...this.encodeRemLen(payload.length), ...payload]);
      this.ws.send(packet);
    } catch (e) {}
  }

  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
      if (this.connected) {
        this._sendSubscribe(topic);
      }
    }
    this.subscribers.get(topic).add(callback);

    // If cached retained message is already present, trigger immediately
    if (this.lastMessages.has(topic)) {
      try {
        callback(this.lastMessages.get(topic));
      } catch (err) {}
    }

    return () => {
      if (this.subscribers.has(topic)) {
        this.subscribers.get(topic).delete(callback);
        if (this.subscribers.get(topic).size === 0) {
          this.subscribers.delete(topic);
        }
      }
    };
  }

  getLastMessage(topic) {
    return this.lastMessages.get(topic) || null;
  }

  async waitForMessage(topic, timeoutMs = 1500) {
    if (this.lastMessages.has(topic)) {
      return this.lastMessages.get(topic);
    }
    return new Promise((resolve) => {
      let resolved = false;
      const tid = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve(null);
        }
      }, timeoutMs);

      const unsub = this.subscribe(topic, (data) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(tid);
          unsub();
          resolve(data);
        }
      });
    });
  }

  publish(topic, data, retain = true) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.queuedPublishes.push({ topic, data, retain });
      return;
    }

    try {
      const payloadStr = typeof data === 'string' ? data : JSON.stringify(data);
      const tBytes = this.encoder.encode(topic);
      const mBytes = this.encoder.encode(payloadStr);
      const remLen = 2 + tBytes.length + mBytes.length;
      const header = retain ? 0x31 : 0x30;

      const packet = new Uint8Array([
        header,
        ...this.encodeRemLen(remLen),
        0,
        tBytes.length,
        ...tBytes,
        ...mBytes
      ]);
      this.ws.send(packet);
    } catch (e) {}
  }
}

export const mqttRelay = new MqttRelayService();
