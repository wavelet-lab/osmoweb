import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, extname, dirname, basename } from "node:path";

function walk(dir, acc = []) {
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        const st = statSync(p);
        if (st.isDirectory()) walk(p, acc);
        else if (st.isFile() && extname(p) === ".mmd") acc.push(p);
    }
    return acc;
}

function run(cmd, args) {
    execFileSync(cmd, args, { stdio: "inherit" });
}

const docsRoot = process.argv[2] ?? "docs";
const files = walk(docsRoot);

if (files.length === 0) {
    console.log(`No .mmd files found under ${docsRoot}/`);
    process.exit(0);
}

const useAAXec = process.env.MMD_AAEXEC === "1";
const aaProfile = process.env.MMD_AAEXEC_PROFILE ?? "chrome";

for (const input of files) {
    const out = join(dirname(input), `${basename(input, ".mmd")}.svg`);
    const args = ["-i", input, "-o", out];

    if (useAAXec) {
        // Using aa-exec to run mmdc for Ubuntu users who have issues with
        // running mmdc directly due to missing libraries.
        run("aa-exec", [`--profile=${aaProfile}`, "mmdc", ...args]);
    } else {
        run("mmdc", args);
    }
}
