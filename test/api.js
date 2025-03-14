import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { platform } from "node:process";

import {
  transpile,
  types,
  opt,
  print,
  parse,
  componentNew,
  componentEmbed,
  metadataShow,
  preview1AdapterReactorPath,
} from "../src/api.js";

import { getCurrentWitComponentVersion } from "./helpers.js";

const isWindows = platform === "win32";

// - (2025/02/04) incrased due to incoming implementations of async and new flush impl
const FLAVORFUL_WASM_TRANSPILED_CODE_CHAR_LIMIT = 28_500;

export async function apiTest(_fixtures) {
  suite("API", () => {
    test("Transpile", async () => {
      const name = "flavorful";
      const component = await readFile(
        `test/fixtures/components/${name}.component.wasm`
      );
      const { files, imports, exports } = await transpile(component, { name });
      strictEqual(imports.length, 4);
      strictEqual(exports.length, 3);
      deepStrictEqual(exports[0], ["test", "instance"]);
      ok(files[name + ".js"]);
    });

    test("Transpile & Optimize & Minify", async () => {
      const name = "flavorful";
      const component = await readFile(
        `test/fixtures/components/${name}.component.wasm`
      );
      const { files, imports, exports } = await transpile(component, {
        name,
        minify: true,
        validLiftingOptimization: true,
        tlaCompat: true,
        optimize: true,
        base64Cutoff: 0,
      });
      strictEqual(imports.length, 4);
      strictEqual(exports.length, 3);
      deepStrictEqual(exports[0], ["test", "instance"]);
      ok(
        files[name + ".js"].length < FLAVORFUL_WASM_TRANSPILED_CODE_CHAR_LIMIT
      );
    });

    test("Transpile to JS", async () => {
      const name = "flavorful";
      const component = await readFile(
        `test/fixtures/components/${name}.component.wasm`
      );
      const { files, imports, exports } = await transpile(component, {
        map: {
          "test:flavorful/*": "./*.js",
        },
        name,
        validLiftingOptimization: true,
        tlaCompat: true,
        base64Cutoff: 0,
        js: true,
      });
      strictEqual(imports.length, 4);
      strictEqual(exports.length, 3);
      deepStrictEqual(exports[0], ["test", "instance"]);
      deepStrictEqual(exports[1], ["test:flavorful/test", "instance"]);
      deepStrictEqual(exports[2], ["testImports", "function"]);
      const source = Buffer.from(files[name + ".js"]).toString();
      ok(source.includes("./test.js"));
      ok(source.includes("FUNCTION_TABLE"));
      for (let i = 0; i < 2; i++) ok(source.includes(exports[i][0]));
    });

    test("Transpile map into package imports", async () => {
      const name = "flavorful";
      const component = await readFile(
        `test/fixtures/components/${name}.component.wasm`
      );
      const { files, imports } = await transpile(component, {
        name,
        map: {
          "test:flavorful/*": "#*import",
        },
      });
      strictEqual(imports.length, 4);
      strictEqual(imports[0], "#testimport");
      const source = Buffer.from(files[name + ".js"]).toString();
      ok(source.includes("'#testimport'"));
    });

    test("Type generation", async () => {
      const files = await types("test/fixtures/wit", {
        worldName: "test:flavorful/flavorful",
      });
      strictEqual(Object.keys(files).length, 2);
      strictEqual(Object.keys(files)[0], "flavorful.d.ts");
      strictEqual(Object.keys(files)[1], "interfaces/test-flavorful-test.d.ts");
      ok(
        Buffer.from(files[Object.keys(files)[0]]).includes(
          "export * as test from './interfaces/test-flavorful-test.js'"
        )
      );
      ok(
        Buffer.from(files[Object.keys(files)[1]]).includes(
          "export type ListInAlias = "
        )
      );
    });

    test("Type generation (guest)", async () => {
      const files = await types("test/fixtures/wit", {
        worldName: "test:flavorful/flavorful",
        guest: true,
      });
      strictEqual(Object.keys(files).length, 2);
      strictEqual(Object.keys(files)[1], "interfaces/test-flavorful-test.d.ts");
      ok(
        Buffer.from(files[Object.keys(files)[0]]).includes(
          "declare module 'test:flavorful/flavorful' {"
        )
      );
      ok(
        Buffer.from(files[Object.keys(files)[1]]).includes(
          "declare module 'test:flavorful/test' {"
        )
      );
    });

    test("Optimize", async () => {
      const component = await readFile(
        `test/fixtures/components/flavorful.component.wasm`
      );
      const { component: optimizedComponent } = await opt(component);
      ok(optimizedComponent.byteLength < component.byteLength);
    });

    test("Print & Parse", async () => {
      const component = await readFile(
        `test/fixtures/components/flavorful.component.wasm`
      );
      const output = await print(component);
      strictEqual(output.slice(0, 10), "(component");

      const componentParsed = await parse(output);
      ok(componentParsed);
    });

    test("Wit & New", async () => {
      const wit = await readFile(
        `test/fixtures/wit/deps/flavorful/flavorful.wit`,
        "utf8"
      );

      const generatedComponent = await componentEmbed({
        witSource: wit,
        dummy: true,
        metadata: [
          ["language", [["javascript", ""]]],
          ["processed-by", [["dummy-gen", "test"]]],
        ],
      });
      {
        const output = await print(generatedComponent);
        strictEqual(output.slice(0, 7), "(module");
      }

      const newComponent = await componentNew(generatedComponent);
      {
        const output = await print(newComponent);
        strictEqual(output.slice(0, 10), "(component");
      }

      const meta = await metadataShow(newComponent);
      deepStrictEqual(meta[0].metaType, {
        tag: "component",
        val: 5,
      });
      deepStrictEqual(meta[1].producers, [
        [
          "processed-by",
          [
            ["wit-component", await getCurrentWitComponentVersion()],
            ["dummy-gen", "test"],
          ],
        ],
        ["language", [["javascript", ""]]],
      ]);
    });

    test("Multi-file WIT", async () => {
      const generatedComponent = await componentEmbed({
        dummy: true,
        witPath:
          (isWindows ? "//?/" : "") +
          fileURLToPath(
            new URL("./fixtures/componentize/source.wit", import.meta.url)
          ),
        metadata: [
          ["language", [["javascript", ""]]],
          ["processed-by", [["dummy-gen", "test"]]],
        ],
      });
      {
        const output = await print(generatedComponent);
        strictEqual(output.slice(0, 7), "(module");
      }

      const newComponent = await componentNew(generatedComponent);
      {
        const output = await print(newComponent);
        strictEqual(output.slice(0, 10), "(component");
      }

      const meta = await metadataShow(newComponent);
      deepStrictEqual(meta[0].metaType, {
        tag: "component",
        val: 2,
      });
      deepStrictEqual(meta[1].producers, [
        [
          "processed-by",
          [
            ["wit-component", await getCurrentWitComponentVersion()],
            ["dummy-gen", "test"],
          ],
        ],
        ["language", [["javascript", ""]]],
      ]);
    });

    test("Component new adapt", async () => {
      const component = await readFile(`test/fixtures/modules/exitcode.wasm`);

      const generatedComponent = await componentNew(component, [
        [
          "wasi_snapshot_preview1",
          await readFile(preview1AdapterReactorPath()),
        ],
      ]);

      await print(generatedComponent);
    });

    test("Extract metadata", async () => {
      const component = await readFile(`test/fixtures/modules/exitcode.wasm`);

      const meta = await metadataShow(component);

      deepStrictEqual(meta, [
        {
          metaType: { tag: "module" },
          producers: [],
          name: undefined,
          parentIndex: undefined,
          range: [0, 262],
        },
      ]);
    });
  });
}
