import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function updateToml(filePath, version) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/^version\s*=\s*".*?"/m, `version = "${version}"`);
  fs.writeFileSync(filePath, content);
}

// Main
const version = readJson(path.join(rootDir, 'version.json')).version;

const pkg = readJson(path.join(rootDir, 'package.json'));
pkg.version = version;
writeJson(path.join(rootDir, 'package.json'), pkg);

const tauriConf = readJson(path.join(rootDir, 'src-tauri/tauri.conf.json'));
tauriConf.version = version;
writeJson(path.join(rootDir, 'src-tauri/tauri.conf.json'), tauriConf);

updateToml(path.join(rootDir, 'src-tauri/Cargo.toml'), version);

console.log(`Version synced to ${version}`);
