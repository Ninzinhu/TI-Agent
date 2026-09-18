"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyDevice, ips } = require("../agent");

test("gera os hosts utilizáveis de uma faixa IPv4", () => {
  assert.deepEqual(ips("192.168.10.0/30", 254), ["192.168.10.1", "192.168.10.2"]);
  assert.throws(() => ips("192.168.10.1/23", 254), /\/24 e \/30/);
});

test("classifica impressora pela porta de impressão", () => {
  const device = classifyDevice({ hostname: "", mac: "00:1B:A9:AA:BB:CC", printer: true });
  assert.equal(device.tipo, "impressora");
  assert.equal(device.manufacturer, "Brother");
});

test("classifica dispositivo sem evidência como outro", () => {
  assert.equal(classifyDevice({ hostname: "desconhecido", mac: "" }).tipo, "outro");
});
