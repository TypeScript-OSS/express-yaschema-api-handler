const YASCHEMA_JSON_PREFIX = 'yaschema/json:';

/**
 * - Substitutes values like: `'yaschema/json:{"one": 1}'` with resolved values like `{ one: 1 }`
 * - Removes `'[]'` suffixes from keys
 */
export const resolveSpecialFormDataFields = (body: any) => {
  if (body === null || typeof body !== 'object') {
    return;
  }

  const bodyObj = body as Record<string, any>;

  for (const [key, value] of Object.entries(bodyObj)) {
    if (typeof value === 'string' && value.startsWith(YASCHEMA_JSON_PREFIX)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const jsonValue = JSON.parse(value.substring(YASCHEMA_JSON_PREFIX.length));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      bodyObj[key] = jsonValue;
    }

    if (key.endsWith('[]')) {
      const newKey = key.substring(0, key.length - '[]'.length);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      bodyObj[newKey] = bodyObj[key];
      delete bodyObj[key];
    }
  }
};
