import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgRoot = path.resolve(__dirname, '..');

function copyDir(src, dest, skipFiles = []) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
        const s = path.join(src, item);
        const d = path.join(dest, item);
        if (fs.statSync(s).isDirectory()) copyDir(s, d, skipFiles);
        else if (!skipFiles.includes(item)) fs.copyFileSync(s, d);
    }
}


(function main() {
    try {
        console.log('Copying osmo-bts-trx-websdr files...');
        copyDir(path.join(pkgRoot, 'src', 'osmo-bts-trx-websdr'), path.join(pkgRoot, 'dist', 'osmo-bts-trx-websdr'), ['pre.js']);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
