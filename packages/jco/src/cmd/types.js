import { platform } from 'node:process';
import { stat } from 'node:fs/promises';
import { extname, basename, resolve } from 'node:path';

import c from 'chalk-template';

import {
    $init,
    generateTypes,
} from '../../obj/js-component-bindgen-component.js';
import {
    writeFiles,
    ASYNC_WASI_IMPORTS,
    ASYNC_WASI_EXPORTS,
} from '../common.js';

const isWindows = platform === 'win32';

export async function types(witPath, opts) {
    const files = await typesComponent(witPath, opts);
    await writeFiles(files, opts.quiet ? false : 'Generated Type Files');
}

export async function guestTypes(witPath, opts) {
    const files = await typesComponent(witPath, { ...opts, guest: true });
    await writeFiles(
        files,
        opts.quiet
            ? false
            : 'Generated Guest Typescript Definition Files (.d.ts)'
    );
}

/**
 * @param {string} witPath
 * @param {{
 *   name?: string,
 *   worldName?: string,
 *   instantiation?: 'async' | 'sync',
 *   tlaCompat?: bool,
 *   asyncMode?: string,
 *   asyncImports?: string[],
 *   asyncExports?: string[],
 *   outDir?: string,
 *   allFeatures?: bool,
 *   feature?: string[] | 'all', // backwards compat
 *   features?: string[] | 'all',
 *   asyncWasiImports?: string[],
 *   asyncWasiExports?: string[],
 *   guest?: bool,
 * }} opts
 * @returns {Promise<{ [filename: string]: Uint8Array }>}
 */
export async function typesComponent(witPath, opts) {
    await $init;
    const name =
        opts.name ||
        (opts.worldName
            ? opts.worldName.split(':').pop().split('/').pop()
            : basename(witPath.slice(0, -extname(witPath).length || Infinity)));
    let instantiation;
    if (opts.instantiation) {
        instantiation = { tag: opts.instantiation };
    }
    let outDir = (opts.outDir ?? '').replace(/\\/g, '/');
    if (!outDir.endsWith('/') && outDir !== '') {
        outDir += '/';
    }

    let features = null;
    if (opts.allFeatures) {
        features = { tag: 'all' };
    } else if (Array.isArray(opts.feature)) {
        features = { tag: 'list', val: opts.feature };
    } else if (Array.isArray(opts.features)) {
        features = { tag: 'list', val: opts.features };
    }

    if (opts.asyncWasiImports) {
        opts.asyncImports = ASYNC_WASI_IMPORTS.concat(opts.asyncImports || []);
    }
    if (opts.asyncWasiExports) {
        opts.asyncExports = ASYNC_WASI_EXPORTS.concat(opts.asyncExports || []);
    }

    const asyncMode =
        !opts.asyncMode || opts.asyncMode === 'sync'
            ? null
            : {
                  tag: opts.asyncMode,
                  val: {
                      imports: opts.asyncImports || [],
                      exports: opts.asyncExports || [],
                  },
              };

    let types;
    const absWitPath = resolve(witPath);
    try {
        types = generateTypes(name, {
            wit: { tag: 'path', val: (isWindows ? '//?/' : '') + absWitPath },
            instantiation,
            tlaCompat: opts.tlaCompat ?? false,
            world: opts.worldName,
            features,
            guest: opts.guest ?? false,
            asyncMode,
        }).map(([name, file]) => [`${outDir}${name}`, file]);
    } catch (err) {
        if (err.toString().includes('does not match previous package name')) {
            const hint = await printWITLayoutHint(absWitPath);
            if (err.message) {
                err.message += `\n${hint}`;
            }
            throw err;
        }
        throw err;
    }

    return Object.fromEntries(types);
}

/**
 * Print a hint about WIT folder layout
 *
 * @param {(string, any) => void} consoleFn
 */
async function printWITLayoutHint(witPath) {
    const pathMeta = await stat(witPath);
    let output = '\n';
    if (!pathMeta.isFile() && !pathMeta.isDirectory()) {
        output += c`{yellow.bold warning} The supplited WIT path [${witPath}] is neither a file or directory.\n`;
        return output;
    }
    const ftype = pathMeta.isDirectory() ? 'directory' : 'file';
    output += c`{yellow.bold warning} Your WIT ${ftype} [${witPath}] may be laid out incorrectly\n`;
    output += c`{yellow.bold warning} Keep in mind the following rules:\n`;
    output += c`{yellow.bold warning}     - Top level WIT files are in the same package (i.e. "ns:pkg" in "wit/*.wit")\n`;
    output += c`{yellow.bold warning}     - All package dependencies should be in "wit/deps" (i.e. "some:dep" in "wit/deps/some-dep.wit"\n`;
    return output;
}

// see: https://github.com/vitest-dev/vitest/issues/6953#issuecomment-2505310022
if (typeof __vite_ssr_import_meta__ !== 'undefined') {
    __vite_ssr_import_meta__.resolve = (path) =>
        'file://' + globalCreateRequire(import.meta.url).resolve(path);
}
