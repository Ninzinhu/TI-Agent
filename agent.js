"use strict";

const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { createServer } = require("node:http");
const { readFileSync, existsSync, writeFileSync } = require("node:fs");
const { resolve, dirname } = require("node:path");
const { reverse } = require("node:dns/promises");
const os = require("node:os");
const net = require("node:net");
const exec = promisify(execFile);
// Em desenvolvimento usa a pasta do código; no executável distribuído usa a pasta do .exe.
const executableConfigPath = resolve(dirname(process.execPath), "config.json");
const sourceConfigPath = resolve(__dirname, "config.json");
const configPath = existsSync(executableConfigPath) ? executableConfigPath : sourceConfigPath;
let lastScan = { startedAt: null, finishedAt: null, devices: [], error: null };
let scanInProgress = false;
const ouiVendors = {
  "00:03:93": { manufacturer: "Apple", type: "telefone" }, "00:0A:95": { manufacturer: "Apple", type: "telefone" }, "00:1C:B3": { manufacturer: "Apple", type: "telefone" }, "00:1E:C2": { manufacturer: "Apple", type: "telefone" }, "00:23:12": { manufacturer: "Apple", type: "telefone" }, "28:CF:DA": { manufacturer: "Apple", type: "telefone" }, "3C:06:30": { manufacturer: "Apple", type: "telefone" }, "40:A6:D9": { manufacturer: "Apple", type: "telefone" }, "70:3E:AC": { manufacturer: "Apple", type: "telefone" }, "F0:18:98": { manufacturer: "Apple", type: "telefone" },
  "00:16:6C": { manufacturer: "Samsung", type: "telefone" }, "28:BA:B5": { manufacturer: "Samsung", type: "telefone" }, "34:AA:99": { manufacturer: "Samsung", type: "telefone" }, "5C:0A:5B": { manufacturer: "Samsung", type: "telefone" }, "78:1F:DB": { manufacturer: "Samsung", type: "telefone" }, "E8:50:8B": { manufacturer: "Samsung", type: "telefone" },
  "28:6C:07": { manufacturer: "Xiaomi", type: "telefone" }, "34:80:B3": { manufacturer: "Xiaomi", type: "telefone" }, "50:64:2B": { manufacturer: "Xiaomi", type: "telefone" }, "64:09:80": { manufacturer: "Xiaomi", type: "telefone" }, "98:FA:E3": { manufacturer: "Xiaomi", type: "telefone" },
  "00:1A:11": { manufacturer: "Google", type: "telefone" }, "3C:5A:B4": { manufacturer: "Google", type: "telefone" }, "F4:F5:D8": { manufacturer: "Google", type: "telefone" },
  "00:1A:4B": { manufacturer: "Hewlett-Packard", type: "computador" }, "00:1E:0B": { manufacturer: "Hewlett-Packard", type: "computador" }, "3C:D9:2B": { manufacturer: "Hewlett-Packard", type: "computador" }, "98:4B:E1": { manufacturer: "Hewlett-Packard", type: "computador" },
  "00:14:22": { manufacturer: "Dell", type: "computador" }, "18:03:73": { manufacturer: "Dell", type: "computador" }, "34:17:EB": { manufacturer: "Dell", type: "computador" }, "B0:83:FE": { manufacturer: "Dell", type: "computador" },
  "00:06:1B": { manufacturer: "Lenovo", type: "computador" }, "40:B0:34": { manufacturer: "Lenovo", type: "computador" }, "54:EE:75": { manufacturer: "Lenovo", type: "computador" }, "98:FA:9B": { manufacturer: "Lenovo", type: "computador" },
  "00:1B:A9": { manufacturer: "Brother", type: "impressora" }, "00:80:77": { manufacturer: "Brother", type: "impressora" }, "00:00:48": { manufacturer: "Epson", type: "impressora" }, "00:04:AC": { manufacturer: "Epson", type: "impressora" }, "00:00:85": { manufacturer: "Canon", type: "impressora" },
  "00:1A:2B": { manufacturer: "Cisco", type: "rede" }, "00:25:9C": { manufacturer: "Cisco", type: "rede" }, "00:0C:29": { manufacturer: "VMware", type: "servidor" }, "00:50:56": { manufacturer: "VMware", type: "servidor" }, "00:1B:21": { manufacturer: "Intel", type: "computador" }
};

function loadConfig() {
  if (!existsSync(configPath)) throw new Error("config.json não encontrado. Copie config.example.json e preencha as configurações.");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (!config.apiUrl || !config.agentToken) throw new Error("apiUrl e agentToken são obrigatórios no config.json.");
  let apiUrl;
  try { apiUrl = new URL(config.apiUrl); } catch { throw new Error("apiUrl deve ser uma URL HTTPS válida."); }
  if (apiUrl.protocol !== "https:") throw new Error("apiUrl deve usar HTTPS.");
  if (config.networkDiscoveryEnabled && !config.network) throw new Error("network é obrigatória quando networkDiscoveryEnabled é true.");
  return { version: "1.1.0", port: 47820, scanIntervalMinutes: 15, heartbeatIntervalSeconds: 120, maxHosts: 254, networkDiscoveryEnabled: false, requestTimeoutSeconds: 15, ...config };
}
function ips(cidr, maxHosts) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(cidr);
  const prefix = Number(match?.[5]);
  const octets = match?.slice(1, 5).map(Number) || [];
  if (!match || octets.some(value => value > 255) || prefix < 24 || prefix > 30) throw new Error("Use uma faixa IPv4 entre /24 e /30, por exemplo 192.168.1.0/24.");
  const address = (((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3]) >>> 0;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const network = (address & mask) >>> 0;
  const count = Math.min(2 ** (32 - prefix) - 2, maxHosts);
  return Array.from({ length: count }, (_, index) => {
    const value = (network + index + 1) >>> 0;
    return `${(value >>> 24) & 255}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`;
  });
}
async function ping(ip) {
  const started = Date.now();
  try { await exec("ping", ["-n", "1", "-w", "700", ip], { windowsHide: true }); return Date.now() - started; } catch { return null; }
}
async function macFor(ip) {
  try { const { stdout } = await exec("arp", ["-a", ip], { windowsHide: true }); return /([0-9a-f]{2}(?:-[0-9a-f]{2}){5})/i.exec(stdout)?.[1]?.replaceAll("-", ":") || ""; } catch { return ""; }
}
function portOpen(ip, port) { return new Promise(resolvePort => { const socket = net.createConnection({ host: ip, port, timeout: 350 }); const done = result => { socket.destroy(); resolvePort(result); }; socket.once("connect", () => done(true)); socket.once("timeout", () => done(false)); socket.once("error", () => done(false)); }); }
function classifyDevice({ hostname, mac, printer, remoteDesktop, smb, ssh }) {
  const vendor = ouiVendors[String(mac || "").toUpperCase().slice(0, 8)]; const name = String(hostname || "").toLowerCase();
  if (printer || /printer|print|laserjet|deskjet|officejet|brother|epson|canon/.test(name)) return { tipo: "impressora", manufacturer: vendor?.manufacturer || "", confidence: printer ? 96 : 74, reason: printer ? "porta de impressão identificada" : "nome do dispositivo" };
  if (/iphone|ipad|android|galaxy|redmi|moto|pixel/.test(name)) return { tipo: "telefone", manufacturer: vendor?.manufacturer || "", confidence: 88, reason: "nome do dispositivo" };
  if (vendor?.type === "telefone") return { tipo: "telefone", manufacturer: vendor.manufacturer, confidence: 66, reason: "fabricante do MAC" };
  if (/router|switch|ap-|access.?point|unifi|mikrotik/.test(name)) return { tipo: "rede", manufacturer: vendor?.manufacturer || "", confidence: 82, reason: "nome do dispositivo" };
  if (vendor?.type === "rede") return { tipo: "rede", manufacturer: vendor.manufacturer, confidence: 70, reason: "fabricante do MAC" };
  if (ssh && !remoteDesktop && !smb) return { tipo: "servidor", manufacturer: vendor?.manufacturer || "", confidence: 62, reason: "serviço SSH identificado" };
  return { tipo: vendor?.type || "outro", manufacturer: vendor?.manufacturer || "", confidence: vendor ? 58 : 25, reason: vendor ? "fabricante do MAC" : "evidências insuficientes" };
}
async function identify(ip, responseMs) {
  let hostname = ""; try { hostname = (await reverse(ip))[0] || ""; } catch {}
  const [raw9100, ipp, remoteDesktop, smb, ssh, mac] = await Promise.all([portOpen(ip, 9100), portOpen(ip, 631), portOpen(ip, 3389), portOpen(ip, 445), portOpen(ip, 22), macFor(ip)]);
  const classification = classifyDevice({ hostname, mac, printer: raw9100 || ipp, remoteDesktop, smb, ssh });
  return { ip, hostname, mac, printer: raw9100 || ipp, responseMs, ...classification };
}
async function powershellJson(command) {
  try {
    const { stdout } = await exec("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { windowsHide: true, timeout: 8000, maxBuffer: 1024 * 1024 });
    return JSON.parse(stdout.trim() || "{}");
  } catch { return {}; }
}
function primaryNetwork() {
  const entries = Object.values(os.networkInterfaces()).flat().filter(Boolean);
  return entries.find(item => item.family === "IPv4" && !item.internal) || {};
}
async function localMachine() {
  const details = await powershellJson("$cs=Get-CimInstance Win32_ComputerSystem; $bios=Get-CimInstance Win32_BIOS; $cpu=Get-CimInstance Win32_Processor | Select-Object -First 1; $disk=Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='C:'\"; $battery=Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue; [pscustomobject]@{manufacturer=$cs.Manufacturer;model=$cs.Model;serial=$bios.SerialNumber;user=$cs.UserName;cpu=$cpu.Name;hasBattery=[bool]$battery;diskFree=[int64]$disk.FreeSpace;diskSize=[int64]$disk.Size} | ConvertTo-Json -Compress");
  const network = primaryNetwork();
  const memoryTotal = os.totalmem(); const memoryFree = os.freemem();
  return {
    ip: network.address || "",
    mac: network.mac || "",
    hostname: os.hostname(),
    nome: os.hostname(),
    tipo: details.hasBattery ? "notebook" : "computador",
    manufacturer: details.manufacturer || "",
    modelo: details.model || "",
    serial: details.serial || "",
    processador: details.cpu || "",
    usuarioLogado: details.user || "",
    sistema: `${os.type()} ${os.release()}`,
    ramTotal: memoryTotal,
    ramLivre: memoryFree,
    discoTotal: Number(details.diskSize || 0),
    discoLivre: Number(details.diskFree || 0),
    tempoLigadoSegundos: Math.round(os.uptime()),
    origem: "agente_local",
    confiancaIdentificacao: 100,
    motivoIdentificacao: "inventário local do Windows",
    status: "online",
  };
}
async function mapConcurrent(items, worker, limit = 24) {
  const result = []; let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (cursor < items.length) { const index = cursor++; const value = await worker(items[index]); if (value) result.push(value); } }));
  return result;
}
async function sync(config, devices, machine, deviceCount) {
  const body = { agentId: config.agentId || os.hostname(), devices, machine, ...(typeof deviceCount === "number" ? { deviceCount } : {}) };
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.requestTimeoutSeconds * 1000);
    try {
      const response = await fetch(config.apiUrl.replace(/\/$/, "") + "/api/ti/ingest", { method: "POST", headers: { "Content-Type": "application/json", "x-ti-agent-token": config.agentToken }, body: JSON.stringify(body), signal: controller.signal });
      if (response.ok) return;
      lastError = new Error(`Servidor respondeu ${response.status}: ${await response.text()}`);
      if (response.status < 500 && response.status !== 429) throw lastError;
    } catch (error) { lastError = error.name === "AbortError" ? new Error("Tempo limite ao conectar ao servidor.") : error; }
    finally { clearTimeout(timer); }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 500 * (2 ** attempt)));
  }
  throw lastError;
}
async function scan() {
  if (scanInProgress) throw new Error("Uma varredura já está em andamento.");
  scanInProgress = true;
  const config = loadConfig(); lastScan = { startedAt: new Date().toISOString(), finishedAt: null, devices: [], error: null };
  try { const online = config.networkDiscoveryEnabled ? await mapConcurrent(ips(config.network, config.maxHosts), async ip => { const responseMs = await ping(ip); return responseMs === null ? null : identify(ip, responseMs); }) : []; await sync(config, online, await localMachine(), online.length); lastScan = { ...lastScan, finishedAt: new Date().toISOString(), devices: online }; return lastScan; } catch (error) { lastScan.error = error.message; lastScan.finishedAt = new Date().toISOString(); throw error; } finally { scanInProgress = false; }
}
async function heartbeat() { const config = loadConfig(); await sync(config, [], await localMachine()); }
function startServer(config) {
  createServer(async (request, response) => { response.setHeader("Content-Type", "application/json; charset=utf-8"); response.setHeader("Cache-Control", "no-store"); if (request.url === "/status") return response.end(JSON.stringify({ name: "Life TI Agent", version: config.version, agentId: config.agentId, networkDiscoveryEnabled: config.networkDiscoveryEnabled, ...lastScan })); if (request.url === "/scan" && request.method === "POST") { try { response.end(JSON.stringify(await scan())); } catch (error) { response.statusCode = 500; response.end(JSON.stringify({ error: error.message })); } return; } response.statusCode = 404; response.end(JSON.stringify({ error: "Rota não encontrada" })); }).listen(config.port, "127.0.0.1", () => console.log(`Life TI Agent ${config.version} ativo em http://127.0.0.1:${config.port}`));
}
if (require.main === module) { const config = loadConfig(); startServer(config); scan().catch(error => console.error("Primeira varredura falhou:", error.message)); setInterval(() => scan().catch(error => console.error("Varredura falhou:", error.message)), config.scanIntervalMinutes * 60_000); setInterval(() => heartbeat().catch(error => console.error("Atualização local falhou:", error.message)), config.heartbeatIntervalSeconds * 1000); }
module.exports = { classifyDevice, ips };
