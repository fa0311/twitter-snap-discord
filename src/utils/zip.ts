type Unzip<T extends readonly unknown[]> = {
	[K in keyof T]: T[K][];
};

export const unzip = <T extends readonly unknown[]>(entries: readonly [...T][]): Unzip<T> => {
	const result: unknown[] = [];

	for (const tuple of entries) {
		tuple.forEach((value, index) => {
			if (!result[index]) {
				result[index] = [];
			}
			(result[index] as unknown[]).push(value);
		});
	}

	return result as Unzip<T>;
};
