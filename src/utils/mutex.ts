import { Semaphore } from "async-mutex";

export const createMutex = (value: number) => {
	const semaphore = new Semaphore(value);
	const runExclusive = <T>(callback: () => Promise<T>): Promise<T> => {
		return new Promise<T>((resolve) => {
			semaphore
				.runExclusive(async () => {
					resolve(callback());
				})
				.catch(async (err) => {
					resolve(err);
				});
		});
	};
	return { runExclusive };
};
