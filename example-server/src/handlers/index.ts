import type { Express } from 'express';

import * as error from './error';
import * as exception from './exception';
import * as ping from './ping';

export const register = (app: Express) => {
  exception.register(app);
  error.register(app);
  ping.register(app);
};
