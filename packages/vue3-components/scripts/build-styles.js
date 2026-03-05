import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgRoot = path.resolve(__dirname, '..');
const srcDir = path.join(pkgRoot, 'src', 'styles');
const outDir = path.join(pkgRoot, 'dist', 'styles');

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function runSass() {
    // Use npx to ensure the use of the local sass
    const res = spawnSync('npx', ['sass', `${srcDir}:${outDir}`, '--no-source-map'], { stdio: 'inherit' });
    return res.status === 0;
}

function copyCssNoOverwrite() {
    let files = [];
    try {
        files = fs.readdirSync(srcDir).filter(f => f.endsWith('.css'));
    } catch (e) {
        return;
    }

    for (const f of files) {
        const src = path.join(srcDir, f);
        const dest = path.join(outDir, f);
        try {
            if (!fs.existsSync(dest)) {
                fs.copyFileSync(src, dest);
            }
        } catch (e) {
        }
    }
}

(function main() {
    console.log('Building styles...');
    try {
        ensureDir(outDir);
        const ok = runSass();
        copyCssNoOverwrite();
        process.exit(ok ? 0 : 1);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
