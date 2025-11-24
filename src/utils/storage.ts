import type { Readable } from "node:stream";
import { createClient, type WebDAVClient } from "webdav";

type WebdavConfig = {
  url: string;
  username: string;
  password: string;
  basePath: string;
  baseShareUrl: string;
};

type ByteType = Parameters<WebDAVClient["putFileContents"]>[1];

export const splitdirs = (dir: string): [string, string] => {
  const list = dir.split("/");
  const next = list.pop();
  return [next ?? "", list.join("/")];
};


export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
};

export const createWebdavClient = (config: WebdavConfig) => {
  const client = createClient(config.url, {
    username: config.username,
    password: config.password,
    maxBodyLength: Number.POSITIVE_INFINITY,
    maxContentLength: Number.POSITIVE_INFINITY,
  });

  const makedirs = async (opt: { dir: string } | { file: string }) => {
    const dir = "dir" in opt ? opt.dir : splitdirs(opt.file)[1];
    if (!(await client.exists(dir))) {
      await makedirs({ dir: splitdirs(dir)[1] });
      await client.createDirectory(dir);
    }
  };

  const path =  (path: string) => {
    const storagePath = `${config.basePath}/${path}`;
    const shareUrl = `${config.baseShareUrl}/${path}`;
    const name = splitdirs(path)[0];

    const createWriteStream = async (options?: Parameters<WebDAVClient["createWriteStream"]>[1]) => {
      await makedirs({ file: storagePath });
      return client.createWriteStream(storagePath, options);
    };
    const putFileContents = async (data: ByteType) => {
      await makedirs({ file: storagePath });
      return client.putFileContents(storagePath, data);
    };
    const exists = async () => {
      return client.exists(storagePath);
    };

    return { url: shareUrl, name: name, createWriteStream, putFileContents, exists };
  };

  return { path };
};