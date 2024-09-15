
export const date2iso = (date = new Date(), offsetHour = 8) => {
  let t = new Date(+date);
  t = new Date(+t + offsetHour * 60 * 60 * 1000);
  return offsetHour? t.toISOString(): t.toISOString().replace("Z", (offsetHour < 0? "-": "+") + (offsetHour < 10? "0" + offsetHour: offsetHour) + ":00");
};

import path from "path";
export const filenameWithoutExt = filename => path.basename(filename).replace(path.extname(filename), "");

import fs from "fs";
import crypto from "crypto";
export const getMD5FromStr = str => Promise.resolve(crypto.createHash("md5").update(str).digest("hex"));
export const getMD5FromFile = path => new Promise((resolve, reject) => {
  const hash = crypto.createHash("md5");
  const rs = fs.createReadStream(path);
  rs.on("error", reject);
  rs.on("data", chunk => hash.update(chunk));
  rs.on("end", () => resolve(hash.digest("hex")));
});

export const keymap = (obj, map) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [map(k), v]));

import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import markedKatex from "./marked-katex-ext.js";
marked.use({ gfm: true, }, gfmHeadingId(), markedKatex());
export { marked };

export async function ls(dirPath, options = {}) {
  const ans = (await fsp.readdir(dirPath, { ...options, withFileTypes: true }));
  return options.withFileTypes ? ans : ans.map(file => path.join(file.parentPath, file.name));
}

export async function lsFiles(dirPath, options = {}) {
  const ans = (await ls(dirPath, { ...options, withFileTypes: true })).filter(file => file.isFile());
  return options.withFileTypes ? ans : ans.map(file => path.join(file.parentPath, file.name));
}

export const pj = ([p]) => p? ([p]) => path.join(p, ...p): p;

