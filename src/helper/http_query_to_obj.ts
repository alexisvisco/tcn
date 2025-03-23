/**
 * Transforms query parameters into a structured object with proper nesting and array handling.
 * - Keys with dots (a.b.c) become nested objects ({a: {b: {c: value}}})
 * - Keys ending with [] are treated as arrays with the [] removed
 * - Handles complex nested cases like a.b[].c and edge cases
 *
 * @param queries Object containing query parameters as returned by c.req.queries()
 * @returns Transformed object with nested properties and properly typed arrays
 */
export function transformQueries(
	queries: Record<string, string[]>
): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const [key, values] of Object.entries(queries)) {
		if (!key) continue;

		const isArray = key.endsWith('[]');
		const cleanKey = isArray ? key.slice(0, -2) : key;

		if (!cleanKey) continue;

		let value: unknown;
		if (isArray) {
			value = values;
		} else if (values.length === 1) {
			value = values[0];
		} else if (values.length > 1) {
			value = values;
		} else {
			value = "";
		}

		if (cleanKey.includes('.')) {
			const keyParts = cleanKey.split('.');

			const setNestedValue = (
				obj: Record<string, unknown>,
				parts: string[],
				val: unknown
			): void => {
				if (parts.length === 0) return;

				const currentPart = parts[0];
				if (!currentPart) {
					if (parts.length > 1) {
						setNestedValue(obj, parts.slice(1), val);
					}
					return;
				}

				const isNestedArray = currentPart.endsWith('[]');
				const cleanCurrentPart = isNestedArray ? currentPart.slice(0, -2) : currentPart;

				if (cleanCurrentPart === '') return;

				if (parts.length === 1) {
					if (isNestedArray) {
						if (!obj[cleanCurrentPart] || !Array.isArray(obj[cleanCurrentPart])) {
							obj[cleanCurrentPart] = [val];
						} else {
							(obj[cleanCurrentPart] as unknown[]).push(val);
						}
					} else {
						obj[cleanCurrentPart] = val;
					}
				} else {
					if (isNestedArray) {
						if (!obj[cleanCurrentPart]) {
							obj[cleanCurrentPart] = [];
						}

						if (!Array.isArray(obj[cleanCurrentPart])) {
							obj[cleanCurrentPart] = [{}];
						} else if ((obj[cleanCurrentPart] as unknown[]).length === 0) {
							(obj[cleanCurrentPart] as unknown[]).push({});
						}

						const nestedArray = obj[cleanCurrentPart] as Record<string, unknown>[];
						setNestedValue(
							nestedArray[nestedArray.length - 1] as Record<string, unknown>,
							parts.slice(1),
							val
						);
					} else {
						if (!obj[cleanCurrentPart] || Array.isArray(obj[cleanCurrentPart])) {
							obj[cleanCurrentPart] = {};
						}
						setNestedValue(
							obj[cleanCurrentPart] as Record<string, unknown>,
							parts.slice(1),
							val
						);
					}
				}
			};

			setNestedValue(result, keyParts, value);
		} else {
			result[cleanKey] = value;
		}
	}

	return result;
}
