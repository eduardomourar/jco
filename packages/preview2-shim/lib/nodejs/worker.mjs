import { parentPort } from "node:worker_threads";
import * as Synclink from "synclink";
import nodeEndpoint from 'synclink/node-adapter';
import { makeRequest } from "../http/make-request.js";

Synclink.expose({
  makeRequest,
}, nodeEndpoint(parentPort));
