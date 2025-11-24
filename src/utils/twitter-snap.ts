import crypto from "node:crypto";

type TwitterSnapConfig = {
  baseurl: string;
};

export const getRand = () => {
  const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const N = 16;
  return Array.from(crypto.randomFillSync(new Uint8Array(N)))
    .map((n) => S[n % S.length])
    .join("");
};

export const createTwitterSnapClient = async (config: TwitterSnapConfig) => {
  const base = async (path: string) => {
    const res = await fetch(`${config.baseurl}${path}`, { method: "GET" });
    const length = res.headers.get("Content-Length");
    const contentType = res.headers.get("Content-Type");
    if (res.ok && res.body && length && contentType) {
      return { res: res, body: res.body, length: length, contentType: contentType };
    } else {
      throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
    }
  };

  const twitter = async (id: string) => {
    return base(`/twitter/${id}`);
  };
  const pixiv = async (id: string) => {
    return base(`/pixiv/${id}`);
  };
  return { twitter, pixiv };
};

export const getExtByContentType = (contentType: string) => {
  if (contentType === "image/png") {
    return "png";
  } else if (contentType === "image/jpeg") {
    return "jpg";
  } else if (contentType === "image/gif") {
    return "gif";
  } else if (contentType === "video/mp4") {
    return "mp4";
  } else {
    throw new Error(`Unknown content type: ${contentType}`);
  }
};