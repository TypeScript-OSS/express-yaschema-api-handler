/** Converts from api-lib / use syntax like `{name}` to method routing syntax like `:name` */
export const convertYaschemaParamSyntaxForExpress = (relativeUrl: string) => relativeUrl.replace(/\{([^}]+)\}/g, ':$1');
