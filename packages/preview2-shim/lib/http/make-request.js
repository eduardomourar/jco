import { toBase64 } from '@smithy/util-base64';

/**
 * @param {import("../../types/imports/wasi-http-types").Request} req
 * @returns {Promise<string>}
 */
export async function makeRequest(req) {
  try {
    const headers = new Headers(req.headers);
    const resp = await fetch(req.uri, {
      method: req.method.toString(),
      headers,
      body: req.body && req.body.length > 0 ? req.body : undefined,
      redirect: "manual",
    });
    const arrayBuffer = await resp.arrayBuffer();
    return JSON.stringify({
      status: resp.status,
      headers: Array.from(resp.headers),
      body:
        arrayBuffer.byteLength > 0
          ? toBase64(new Uint8Array(arrayBuffer)) 
          : undefined,
    });
  } catch (err) {
    return JSON.stringify({ message: err.toString() });
  }
}
