import fs from "node:fs/promises";

export const exists = async (path: string) => {
	return await fs
		.stat(path)
		.then(() => true)
		.catch(() => false);
};
