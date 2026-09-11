import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compileFromFile } from "json-schema-to-typescript";

const root = resolve(import.meta.dirname, "..");
const schemaDir = resolve(root, "packages/contracts/schema");
const outputDir = resolve(root, "packages/contracts/src/generated");

const schemas = [
  ["student-profile.schema.json", "student-profile.ts"],
  ["target-scenario.schema.json", "target-scenario.ts"],
  ["match-result.schema.json", "match-result.ts"],
  ["data-release.schema.json", "data-release.ts"]
];

await mkdir(outputDir, { recursive: true });

for (const [input, output] of schemas) {
  const compiled = await compileFromFile(resolve(schemaDir, input), {
    bannerComment:
      "/** Generated from the frozen handoff schema. Do not edit by hand. */",
    style: { singleQuote: false },
    unknownAny: false
  });
  await writeFile(resolve(outputDir, output), compiled, "utf8");
}

const exports = schemas
  .map(([, output]) => `export * from "./${output.replace(/\.ts$/, ".js")}";`)
  .join("\n");
await writeFile(resolve(outputDir, "index.ts"), `${exports}\n`, "utf8");
