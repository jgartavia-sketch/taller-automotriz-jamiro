import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

async function check(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);

    if (item.isDirectory()) {
      await check(path);
    } else if (/\.(tsx?|css)$/.test(item.name)) {
      const content = await readFile(path, "utf8");
      assert.doesNotMatch(
        content,
        /Ã|Â|â€|\uFFFD/,
        `Codificación dañada: ${path}`
      );
    }
  }
}

test("los textos de la aplicación conservan UTF-8", () =>
  check(fileURLToPath(new URL("../app", import.meta.url)))
);