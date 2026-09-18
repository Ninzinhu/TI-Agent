"use strict";

const { readFileSync, mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { randomUUID } = require("node:crypto");

const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
const components = [{ type: "application", name: packageJson.name, version: packageJson.version, licenses: [{ license: { id: packageJson.license } }] }];
for (const [name, version] of Object.entries(packageJson.dependencies || {})) components.push({ type: "library", name, version });
mkdirSync("dist", { recursive: true });
writeFileSync(resolve("dist", "sbom.cdx.json"), JSON.stringify({ bomFormat: "CycloneDX", specVersion: "1.5", serialNumber: `urn:uuid:${randomUUID()}`, version: 1, metadata: { component: components[0] }, components }, null, 2));
