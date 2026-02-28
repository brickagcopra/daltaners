import { authHandlers } from './auth.handlers';
import { productsHandlers } from './products.handlers';
import { storesHandlers } from './stores.handlers';
import { ordersHandlers } from './orders.handlers';
import { usersHandlers } from './users.handlers';
import { adminHandlers } from './admin.handlers';
import { vendorHandlers } from './vendor.handlers';

export const handlers = [
  ...authHandlers,
  ...productsHandlers,
  ...storesHandlers,
  ...ordersHandlers,
  ...usersHandlers,
  ...adminHandlers,
  ...vendorHandlers,
];
