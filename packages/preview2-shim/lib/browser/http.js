import * as Synclink from "synclink";
import { fromBase64 } from '@smithy/util-base64';
import { UnexpectedError } from "../http/error.js";

export function send(req) {
  console.log(`[http] Send (browser) ${req.uri}`);
  const worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: "module" });
  const proxy = Synclink.wrap(worker);
  let rawResponse = proxy.makeRequest(req).syncify();
  worker.terminate();
  let response = JSON.parse(rawResponse);
  if (response.status) {
    return {
      ...response,
      body: response.body ? fromBase64(response.body) : undefined,
    };
  }
  throw new UnexpectedError(response.message);
}

export const incomingHandler = {
  handle () {

  }
};

export const outgoingHandler = {
  handle () {

  }
};

export const types = {
  dropFields(_fields) {
    console.log("[types] Drop fields");
  },
  newFields(_entries) {
    console.log("[types] New fields");
  },
  fieldsGet(_fields, _name) {
    console.log("[types] Fields get");
  },
  fieldsSet(_fields, _name, _value) {
    console.log("[types] Fields set");
  },
  fieldsDelete(_fields, _name) {
    console.log("[types] Fields delete");
  },
  fieldsAppend(_fields, _name, _value) {
    console.log("[types] Fields append");
  },
  fieldsEntries(_fields) {
    console.log("[types] Fields entries");
  },
  fieldsClone(_fields) {
    console.log("[types] Fields clone");
  },
  finishIncomingStream(s) {
    console.log(`[types] Finish incoming stream ${s}`);
  },
  finishOutgoingStream(s, _trailers) {
    console.log(`[types] Finish outgoing stream ${s}`);
  },
  dropIncomingRequest(_req) {
    console.log("[types] Drop incoming request");
  },
  dropOutgoingRequest(_req) {
    console.log("[types] Drop outgoing request");
  },
  incomingRequestMethod(_req) {
    console.log("[types] Incoming request method");
  },
  incomingRequestPathWithQuery(_req) {
    console.log("[types] Incoming request path with query");
  },
  incomingRequestScheme(_req) {
    console.log("[types] Incoming request scheme");
  },
  incomingRequestAuthority(_req) {
    console.log("[types] Incoming request authority");
  },
  incomingRequestHeaders(_req) {
    console.log("[types] Incoming request headers");
  },
  incomingRequestConsume(_req) {
    console.log("[types] Incoming request consume");
  },
  newOutgoingRequest(_method, _pathWithQuery, _scheme, _authority, _headers) {
    console.log("[types] New outgoing request");
  },
  outgoingRequestWrite(_req) {
    console.log("[types] Outgoing request write");
  },
  dropResponseOutparam(_res) {
    console.log("[types] Drop response outparam");
  },
  setResponseOutparam(_response) {
    console.log("[types] Drop fields");
  },
  dropIncomingResponse(_res) {
    console.log("[types] Drop incoming response");
  },
  dropOutgoingResponse(_res) {
    console.log("[types] Drop outgoing response");
  },
  incomingResponseStatus(_res) {
    console.log("[types] Incoming response status");
  },
  incomingResponseHeaders(_res) {
    console.log("[types] Incoming response headers");
  },
  incomingResponseConsume(_res) {
    console.log("[types] Incoming response consume");
  },
  newOutgoingResponse(_statusCode, _headers) {
    console.log("[types] New outgoing response");
  },
  outgoingResponseWrite(_res) {
    console.log("[types] Outgoing response write");
  },
  dropFutureIncomingResponse(_f) {
    console.log("[types] Drop future incoming response");
  },
  futureIncomingResponseGet(_f) {
    console.log("[types] Future incoming response get");
  },
  listenToFutureIncomingResponse(_f) {
    console.log("[types] Listen to future incoming response");
  }
};
