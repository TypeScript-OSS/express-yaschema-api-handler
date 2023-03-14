import type { Express } from 'express';

import * as arrayQuery from './array-query';
import * as error from './error';
import * as exception from './exception';
import * as ping from './ping';

export const register = async (app: Express) =>
  Promise.all([arrayQuery.register(app), exception.register(app), error.register(app), ping.register(app)]);
