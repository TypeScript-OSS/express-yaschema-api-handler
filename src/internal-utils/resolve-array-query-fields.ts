/**
 * - Removes `'[]'` suffixes from keys
 */
export const resolveArrayQueryFields = (query: any) => {
  if (query === null || typeof query !== 'object') {
    return;
  }

  const queryObj = { ...query } as Record<string, any>;

  for (const key of Object.keys(queryObj)) {
    // This is specifically for dealing with arrays, which, in Express 5, don't automatically get their suffixes removed
    if (key.endsWith('[]')) {
      const newKey = key.substring(0, key.length - '[]'.length);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      queryObj[newKey] = queryObj[key];
      delete queryObj[key];
      console.log('updated', queryObj);
    }
  }

  return queryObj;
};
