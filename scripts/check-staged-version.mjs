import { execSync } from "node:child_process";

function stagedFiles() {
  const out = execSync("git diff --cached --name-only", { encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

function readStagedPackageJson() {
  return execSync("git show :package.json", { encoding: "utf8" });
}

function readHeadPackageJson() {
  return execSync("git show HEAD:package.json", { encoding: "utf8" });
}

const files = stagedFiles();
if (!files.includes("package.json")) {
  process.exit(0);
}

let headVersion;
try {
  headVersion = JSON.parse(readHeadPackageJson()).version;
} catch {
  process.exit(0);
}

let stagedVersion;
try {
  stagedVersion = JSON.parse(readStagedPackageJson()).version;
} catch (e) {
  console.error("pre-commit: failed to parse package.json from index:", e.message);
  process.exit(1);
}

if (stagedVersion === headVersion) {
  console.error(
    'pre-commit: there is package.json in index, but the "version" field has not changed ' +
      `(${JSON.stringify(headVersion)}). Increase the version before committing.`,
  );
  process.exit(1);
}

process.exit(0);
