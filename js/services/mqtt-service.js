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
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const brokerUrl = this.brokers[this.brokerIndex];
    try {
      this.ws = new WebSocket(brokerUrl, 'mqtt');
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        // Send MQTT CONNECT Packet
        const cidStr = 'tc_' + Math.random().toString(36).substring(2, 10);
        const cidBytes = this.encoder.encode(cidStr);
        const varHeader = [0, 4, 77, 81, 84, 84, 4, 2, 0, 60]; // Protocol: MQTT, Level 4 (v3.1.1), CleanSession=1, KeepAlive=60s
        const payload = [0, cidBytes.length, ...cidBytes];
        const remLen = varHeader.length + payload.length;

        const packet = new Uint8Array([0x10, ...this.encodeRemLen(remLen), ...varHeader, ...payload]);
        this.ws.send(packet);
      };

      this.ws.onmessage = (event) => {
        const buf = new Uint8Array(event.data);
        if (buf.length === 0) return;
        const packetType = buf[0] >> 4;

        if (packetType === 2) {
          // CONNACK (Connected)
          this.connected = true;
          console.log('⚡ [Realtime Relay] Connected to:', brokerUrl);

          // Start Keep-Alive Ping every 25s
          this.startPing();

          // Resubscribe to all active topics
          for (const topic of this.subscribers.keys()) {
            this._sendSubscribe(topic);
          }

          // Flush queued publishes
          while (this.queuedPublishes.length > 0) {
            const q = this.queuedPublishes.shift();
            this.publish(q.topic, q.data, q.retain);
          }
        } else if (packetType === 3) {
          // PUBLISH received
          try {
            const { nextOffset } = this.decodeRemLen(buf, 1);
            let offset = nextOffset;
            const topicLen = (buf[offset] << 8) | buf[offset + 1];
            offset += 2;
            const topic = this.decoder.decode(buf.slice(offset, offset + topicLen));
            offset += topicLen;
            const payloadStr = this.decoder.decode(buf.slice(offset));

            let parsedData = payloadStr;
            try {
              parsedData = JSON.parse(payloadStr);
            } catch (e) {}

            if (this.subscribers.has(topic)) {
              this.subscribers.get(topic).forEach((cb) => {
                try {
                  cb(parsedData);
                } catch (err) {
                  console.error('Relay callback error:', err);
                }
              });
            }
          } catch (e) {
            console.warn('Error parsing incoming relay packet:', e);
          }
        }
      };

      this.ws.onerror = () => {
        // Fallback to next broker on error
        this.connected = false;
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.stopPing();
        // Cycle broker and reconnect after 1.5s
        this.brokerIndex = (this.brokerIndex + 1) % this.brokers.length;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 1500);
      };
    } catch (err) {
      console.warn('WebSocket init note:', err.message);
    }
  }

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        // PINGREQ packet: 0xC0, 0x00
        this.ws.send(new Uint8Array([0xc0, 0x00]));
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
    const tBytes = this.encoder.encode(topic);
    const payload = [0, 1, 0, tBytes.length, ...tBytes, 0]; // PacketId 1, QoS 0
    const packet = new Uint8Array([0x82, ...this.encodeRemLen(payload.length), ...payload]);
    this.ws.send(packet);
  }

  /**
   * Subscribe to topic (e.g. `tc_kalor/session/TC88`)
   */
  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
      if (this.connected) {
        this._sendSubscribe(topic);
      }
    }
    this.subscribers.get(topic).add(callback);

    return () => {
      if (this.subscribers.has(topic)) {
        this.subscribers.get(topic).delete(callback);
        if (this.subscribers.get(topic).size === 0) {
          this.subscribers.delete(topic);
        }
      }
    };
  }

  /**
   * Publish data with optional retain flag (Instant delivery + Retained for late joiners)
   */
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
      const header = retain ? 0x31 : 0x30; // 0x31 = PUBLISH with retain flag, QoS 0

      const packet = new Uint8Array([
        header,
        ...this.encodeRemLen(remLen),
        0,
        tBytes.length,
        ...tBytes,
        ...mBytes
      ]);
      this.ws.send(packet);
    } catch (e) {
      console.warn('Relay publish error:', e);
    }
  }
}

export const mqttRelay = new MqttRelayService();
