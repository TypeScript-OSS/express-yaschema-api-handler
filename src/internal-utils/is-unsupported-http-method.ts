import type { HttpMethod } from 'yaschema-api';

import type { UnsupportedHttpMethod } from '../internal-consts/express-handlers-by-http-method';
import { unsupportedHttpMethods } from '../internal-consts/express-handlers-by-http-method';

export const isUnsupportedHttpMethod = (method: HttpMethod): method is UnsupportedHttpMethod => unsupportedHttpMethods.has(method);
