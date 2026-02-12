#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  ACURAST PROCESSOR TOOLKIT                               ║
 * ║  P-256 Keypair Gen → SS58 Address → Signed Check-In      ║
 * ║  + Real Device Monitoring                                 ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Usage:                                                   ║
 * ║    node acurast-toolkit.js generate [count]               ║
 * ║    node acurast-toolkit.js checkin <server_url>           ║
 * ║    node acurast-toolkit.js monitor <server_url> [addr..]  ║
 * ║    node acurast-toolkit.js status <server_url> <address>  ║
 * ║    node acurast-toolkit.js history <server_url> <address> ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const crypto = require('crypto');
const EC = require('elliptic').ec;
const ec = new EC('p256');

// ═══════════════════════════════════════════
// BLAKE2b Implementation (minimal, 256-bit)
// ═══════════════════════════════════════════
// Using Node's crypto if available, fallback to manual
let blake2b256, blake2b512;
try {
  // Node 18+ has blake2b
  blake2b256 = (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');
    return crypto.createHash('blake2b512').update(buf).digest().slice(0, 32);
  };
  blake2b512 = (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');
    return crypto.createHash('blake2b512').update(buf).digest();
  };
  // Test it
  blake2b256(Buffer.from('test'));
} catch {
  // Fallback: use blakejs if available
  try {
    const blake = require('blakejs');
    blake2b256 = (data) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');
      return Buffer.from(blake.blake2b(buf, null, 32));
    };
    blake2b512 = (data) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');
      return Buffer.from(blake.blake2b(buf, null, 64));
    };
  } catch {
    console.error('❌ Need blakejs: npm install blakejs');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════
// BASE58 ENCODING (Substrate SS58)
// ═══════════════════════════════════════════
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer) {
  if (buffer.length === 0) return '';
  
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  
  let result = '';
  // leading zeros
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    result += BASE58_ALPHABET[0];
  }
  // convert digits
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

// ═══════════════════════════════════════════
// SS58 ADDRESS DERIVATION
// ═══════════════════════════════════════════
const SS58_PREFIX = 42; // Generic Substrate / Acurast

function deriveSS58Address(publicKeyHex) {
  const pubKeyBuf = Buffer.from(publicKeyHex, 'hex');
  
  // BLAKE2b-256 hash of compressed public key → account ID
  const accountId = blake2b256(pubKeyBuf);
  
  // SS58 checksum: BLAKE2b-512("SS58PRE" + prefix_byte + accountId)
  const ss58Pre = Buffer.from('SS58PRE');
  const prefixBuf = Buffer.from([SS58_PREFIX]);
  const checksumPayload = Buffer.concat([ss58Pre, prefixBuf, accountId]);
  const checksum = blake2b512(checksumPayload);
  
  // Final: prefix(1) + accountId(32) + checksum(2)
  const address = Buffer.concat([prefixBuf, accountId, checksum.slice(0, 2)]);
  
  return base58Encode(address);
}

// ═══════════════════════════════════════════
// P-256 KEYPAIR GENERATION
// ═══════════════════════════════════════════
function generateKeypair() {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate('hex').padStart(64, '0');
  const publicKeyFull = keyPair.getPublic('hex');
  const publicKeyCompressed = keyPair.getPublic(true, 'hex');
  const ss58Address = deriveSS58Address(publicKeyCompressed);
  
  return {
    privateKey,
    publicKeyFull,
    publicKeyCompressed,
    ss58Address,
    keyPair,
  };
}

// ═══════════════════════════════════════════
// SIGNATURE GENERATION (Android format)
// ═══════════════════════════════════════════
function signCheckIn(keyPair, checkInBody) {
  const message = JSON.stringify(checkInBody);
  const hash = crypto.createHash('sha256').update(message).digest();
  
  // Sign with recovery parameter
  const signature = keyPair.sign(hash, { canonical: true });
  
  // Format: r(32) + s(32) + v(1) = 65 bytes
  const r = signature.r.toArrayLike(Buffer, 'be', 32);
  const s = signature.s.toArrayLike(Buffer, 'be', 32);
  const recoveryParam = signature.recoveryParam;
  const v = Buffer.from([recoveryParam]);
  
  return Buffer.concat([r, s, v]).toString('hex');
}

// ═══════════════════════════════════════════
// DEVICE STATE SIMULATOR
// ═══════════════════════════════════════════
class DeviceSimulator {
  constructor(keypair, deviceName) {
    this.keypair = keypair;
    this.deviceName = deviceName;
    this.state = {
      batteryLevel: 50 + Math.random() * 50,
      isCharging: Math.random() > 0.5,
      batteryHealth: 'good',
      temperatures: {
        battery: 28 + Math.random() * 10,
        cpu: 35 + Math.random() * 20,
        gpu: 33 + Math.random() * 15,
        ambient: 20 + Math.random() * 10,
      },
      networkType: 'wifi',
      ssid: `AcurastNet-${Math.floor(Math.random() * 100)}`,
    };
  }
  
  evolve() {
    // Battery
    if (this.state.isCharging) {
      this.state.batteryLevel = Math.min(100, this.state.batteryLevel + 0.5 + Math.random());
    } else {
      this.state.batteryLevel = Math.max(0, this.state.batteryLevel - 0.05 - Math.random() * 0.15);
    }
    
    // Random charging toggle (1% chance)
    if (Math.random() < 0.01) {
      this.state.isCharging = !this.state.isCharging;
    }
    
    // Temperature fluctuation
    for (const key of Object.keys(this.state.temperatures)) {
      this.state.temperatures[key] += (Math.random() - 0.5) * 2;
      this.state.temperatures[key] = Math.max(15, Math.min(80, this.state.temperatures[key]));
    }
    
    // Random SSID change (0.1% chance)
    if (Math.random() < 0.001) {
      this.state.ssid = `AcurastNet-${Math.floor(Math.random() * 100)}`;
    }
  }
  
  buildCheckIn() {
    this.evolve();
    return {
      deviceAddress: this.keypair.ss58Address,
      platform: 0, // Android
      timestamp: Math.floor(Date.now() / 1000),
      batteryLevel: parseFloat(this.state.batteryLevel.toFixed(1)),
      isCharging: this.state.isCharging,
      batteryHealth: this.state.batteryHealth,
      temperatures: {
        battery: parseFloat(this.state.temperatures.battery.toFixed(1)),
        cpu: parseFloat(this.state.temperatures.cpu.toFixed(1)),
        gpu: parseFloat(this.state.temperatures.gpu.toFixed(1)),
        ambient: parseFloat(this.state.temperatures.ambient.toFixed(1)),
      },
      networkType: this.state.networkType,
      ssid: this.state.ssid,
    };
  }
}

// ═══════════════════════════════════════════
// HTTP CLIENT
// ═══════════════════════════════════════════
async function httpRequest(url, options = {}) {
  const { default: fetch } = await import('node-fetch').catch(() => {
    // Fallback to native fetch (Node 18+)
    return { default: globalThis.fetch };
  });
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  
  return { status: response.status, data: json, ok: response.ok };
}

// ═══════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════

// --- GENERATE ---
function cmdGenerate(count = 7) {
  console.log(`\n\x1b[31m╔══════════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[31m║\x1b[0m  \x1b[1m⚡ ACURAST P-256 KEYPAIR GENERATOR\x1b[0m           \x1b[31m║\x1b[0m`);
  console.log(`\x1b[31m╚══════════════════════════════════════════════╝\x1b[0m\n`);
  
  const keypairs = [];
  
  for (let i = 0; i < count; i++) {
    const kp = generateKeypair();
    keypairs.push(kp);
    
    console.log(`\x1b[36m── Device ${i + 1} ──────────────────────────────────\x1b[0m`);
    console.log(`  \x1b[33mSS58 Address:\x1b[0m  ${kp.ss58Address}`);
    console.log(`  \x1b[33mPrivate Key:\x1b[0m   ${kp.privateKey}`);
    console.log(`  \x1b[33mPublic Key:\x1b[0m    ${kp.publicKeyCompressed}`);
    console.log('');
  }
  
  // Save to file
  const exportData = keypairs.map((kp, i) => ({
    device: i + 1,
    ss58Address: kp.ss58Address,
    privateKey: kp.privateKey,
    publicKeyCompressed: kp.publicKeyCompressed,
  }));
  
  const filename = `acurast-keypairs-${Date.now()}.json`;
  require('fs').writeFileSync(filename, JSON.stringify(exportData, null, 2));
  console.log(`\x1b[32m✅ Keypairs saved to ${filename}\x1b[0m`);
  console.log(`\x1b[31m⚠️  GARDE CE FICHIER EN SÉCURITÉ — les clés privées permettent de signer des check-ins\x1b[0m\n`);
  
  return keypairs;
}

// --- CHECK-IN ---
async function cmdCheckIn(serverUrl, keypairsFile, intervalSec = 60) {
  console.log(`\n\x1b[31m╔══════════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[31m║\x1b[0m  \x1b[1m📡 ACURAST CHECK-IN SIMULATOR\x1b[0m                \x1b[31m║\x1b[0m`);
  console.log(`\x1b[31m╚══════════════════════════════════════════════╝\x1b[0m\n`);
  
  // Load keypairs
  let keypairsData;
  if (keypairsFile) {
    keypairsData = JSON.parse(require('fs').readFileSync(keypairsFile, 'utf8'));
  } else {
    // Find most recent keypairs file
    const files = require('fs').readdirSync('.').filter(f => f.startsWith('acurast-keypairs-'));
    if (files.length === 0) {
      console.log('\x1b[31m❌ No keypairs file found. Run: node acurast-toolkit.js generate\x1b[0m');
      process.exit(1);
    }
    keypairsFile = files.sort().pop();
    keypairsData = JSON.parse(require('fs').readFileSync(keypairsFile, 'utf8'));
  }
  
  console.log(`\x1b[33m📂 Loaded ${keypairsData.length} keypairs from ${keypairsFile}\x1b[0m`);
  console.log(`\x1b[33m🌐 Server: ${serverUrl}\x1b[0m`);
  console.log(`\x1b[33m⏱️  Interval: ${intervalSec}s\x1b[0m\n`);
  
  // Reconstruct EC keypairs
  const simulators = keypairsData.map((kpData, i) => {
    const keyPair = ec.keyFromPrivate(kpData.privateKey, 'hex');
    const keypair = {
      privateKey: kpData.privateKey,
      publicKeyCompressed: kpData.publicKeyCompressed,
      ss58Address: kpData.ss58Address,
      keyPair,
    };
    return new DeviceSimulator(keypair, `Device-${i + 1}`);
  });
  
  // Check-in loop
  let cycle = 0;
  const doCheckIn = async () => {
    cycle++;
    console.log(`\x1b[90m─── Cycle ${cycle} @ ${new Date().toLocaleTimeString()} ───\x1b[0m`);
    
    for (const sim of simulators) {
      const body = sim.buildCheckIn();
      const signature = signCheckIn(sim.keypair.keyPair, body);
      
      try {
        const res = await httpRequest(`${serverUrl}/processor/check-in`, {
          method: 'POST',
          headers: { 'X-Device-Signature': signature },
          body: JSON.stringify(body),
        });
        
        const icon = res.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        const bat = body.isCharging ? '🔌' : '🔋';
        console.log(`  ${icon} ${sim.deviceName} | ${body.deviceAddress.slice(0, 12)}... | ${bat} ${body.batteryLevel}% | ${body.networkType} | HTTP ${res.status}`);
      } catch (err) {
        console.log(`  \x1b[31m✗\x1b[0m ${sim.deviceName} | ERROR: ${err.message}`);
      }
    }
    console.log('');
  };
  
  await doCheckIn();
  const timer = setInterval(doCheckIn, intervalSec * 1000);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\x1b[33m⚡ Shutting down...\x1b[0m');
    clearInterval(timer);
    process.exit(0);
  });
}

// --- MONITOR ---
async function cmdMonitor(serverUrl, addresses) {
  console.log(`\n\x1b[31m╔══════════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[31m║\x1b[0m  \x1b[1m👁️  ACURAST DEVICE MONITOR\x1b[0m                   \x1b[31m║\x1b[0m`);
  console.log(`\x1b[31m╚══════════════════════════════════════════════╝\x1b[0m\n`);
  
  if (addresses.length === 0) {
    console.log('\x1b[31m❌ Provide at least one SS58 address\x1b[0m');
    console.log('Usage: node acurast-toolkit.js monitor <server_url> <addr1> <addr2> ...\n');
    process.exit(1);
  }
  
  console.log(`\x1b[33m🌐 Server: ${serverUrl}\x1b[0m`);
  console.log(`\x1b[33m📱 Devices: ${addresses.length}\x1b[0m\n`);
  
  // Bulk status
  const addrParam = addresses.join(',');
  try {
    const res = await httpRequest(`${serverUrl}/processor/api/status/bulk?addresses=${addrParam}`);
    
    if (res.ok && res.data.processorStatuses) {
      const statuses = res.data.processorStatuses;
      
      for (const addr of addresses) {
        const status = statuses[addr];
        if (status) {
          const lastSeen = new Date(status.timestamp * 1000).toLocaleString();
          const bat = status.isCharging ? '🔌' : '🔋';
          console.log(`\x1b[36m${addr.slice(0, 16)}...\x1b[0m`);
          console.log(`  ${bat} Battery: ${status.batteryLevel}% | Health: ${status.batteryHealth || 'N/A'}`);
          console.log(`  📡 Network: ${status.networkType} | SSID: ${status.ssid || 'N/A'}`);
          if (status.temperatures) {
            const t = status.temperatures;
            console.log(`  🌡️  CPU: ${t.cpu || '?'}°C | GPU: ${t.gpu || '?'}°C | Battery: ${t.battery || '?'}°C | Ambient: ${t.ambient || '?'}°C`);
          }
          console.log(`  ⏰ Last seen: ${lastSeen}`);
          console.log('');
        } else {
          console.log(`\x1b[31m${addr.slice(0, 16)}... → No data found\x1b[0m\n`);
        }
      }
    } else {
      console.log(`\x1b[31m❌ Server error: HTTP ${res.status}\x1b[0m`);
      console.log(JSON.stringify(res.data, null, 2));
    }
  } catch (err) {
    console.log(`\x1b[31m❌ Connection error: ${err.message}\x1b[0m`);
  }
}

// --- STATUS ---
async function cmdStatus(serverUrl, address) {
  try {
    const res = await httpRequest(`${serverUrl}/processor/api/${address}/status`);
    console.log(`\n\x1b[33mStatus for ${address}:\x1b[0m`);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log(`\x1b[31m❌ Error: ${err.message}\x1b[0m`);
  }
}

// --- HISTORY ---
async function cmdHistory(serverUrl, address, limit = 20) {
  try {
    const res = await httpRequest(`${serverUrl}/processor/api/${address}/history?limit=${limit}`);
    console.log(`\n\x1b[33mHistory for ${address} (last ${limit}):\x1b[0m`);
    
    if (res.ok && res.data.history) {
      for (const entry of res.data.history) {
        const time = new Date(entry.timestamp * 1000).toLocaleTimeString();
        const bat = entry.isCharging ? '⚡' : '🔋';
        console.log(`  ${time} | ${bat} ${entry.batteryLevel}% | ${entry.networkType} | CPU: ${entry.temperatures?.cpu || '?'}°C`);
      }
    } else {
      console.log(JSON.stringify(res.data, null, 2));
    }
  } catch (err) {
    console.log(`\x1b[31m❌ Error: ${err.message}\x1b[0m`);
  }
}

// ═══════════════════════════════════════════
// CLI ROUTER
// ═══════════════════════════════════════════
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'generate':
  case 'gen':
    cmdGenerate(parseInt(args[1]) || 7);
    break;
    
  case 'checkin':
  case 'check-in':
    if (!args[1]) {
      console.log('Usage: node acurast-toolkit.js checkin <server_url> [keypairs.json] [interval_sec]');
      console.log('Example: node acurast-toolkit.js checkin http://localhost:9001 keypairs.json 60');
      process.exit(1);
    }
    cmdCheckIn(args[1], args[2] || null, parseInt(args[3]) || 60);
    break;
    
  case 'monitor':
  case 'mon':
    if (!args[1]) {
      console.log('Usage: node acurast-toolkit.js monitor <server_url> <addr1> <addr2> ...');
      process.exit(1);
    }
    cmdMonitor(args[1], args.slice(2));
    break;
    
  case 'status':
    if (!args[1] || !args[2]) {
      console.log('Usage: node acurast-toolkit.js status <server_url> <address>');
      process.exit(1);
    }
    cmdStatus(args[1], args[2]);
    break;
    
  case 'history':
  case 'hist':
    if (!args[1] || !args[2]) {
      console.log('Usage: node acurast-toolkit.js history <server_url> <address> [limit]');
      process.exit(1);
    }
    cmdHistory(args[1], args[2], parseInt(args[3]) || 20);
    break;
    
  default:
    console.log(`
\x1b[31m╔══════════════════════════════════════════════════════╗
║  ACURAST PROCESSOR TOOLKIT                            ║
╚══════════════════════════════════════════════════════╝\x1b[0m

\x1b[1mCommands:\x1b[0m

  \x1b[33mgenerate [count]\x1b[0m
    Generate P-256 keypairs with SS58 addresses
    Default: 7 keypairs
    
  \x1b[33mcheckin <server_url> [keypairs.json] [interval]\x1b[0m
    Send signed check-ins to server
    Uses generated keypairs, signs with P-256 ECDSA
    
  \x1b[33mmonitor <server_url> <addr1> [addr2] ...\x1b[0m
    Monitor real device statuses (bulk query)
    No signature needed (GET endpoints)
    
  \x1b[33mstatus <server_url> <address>\x1b[0m
    Get latest status for one device
    
  \x1b[33mhistory <server_url> <address> [limit]\x1b[0m
    Get check-in history for one device

\x1b[1mExamples:\x1b[0m
  node acurast-toolkit.js generate 7
  node acurast-toolkit.js checkin http://localhost:9001
  node acurast-toolkit.js monitor http://localhost:9001 5Grwva... 5FHnea...
`);
}
