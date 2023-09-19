import * as Synclink from "synclink";
import { makeRequest } from "../http/make-request.js";

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {  
  Synclink.expose({
    makeRequest,
  });
}
