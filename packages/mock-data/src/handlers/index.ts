import { authHandlers } from './auth.handlers';
import { productsHandlers } from './products.handlers';
import { storesHandlers } from './stores.handlers';
import { ordersHandlers } from './orders.handlers';
import { usersHandlers } from './users.handlers';
import { adminHandlers } from './admin.handlers';
import { vendorHandlers } from './vendor.handlers';
import { reviewsHandlers } from './reviews.handlers';
import { walletHandlers } from './wallet.handlers';
import { loyaltyHandlers } from './loyalty.handlers';
import { searchHandlers } from './search.handlers';
import { recommendationsHandlers } from './recommendations.handlers';
import { posHandlers } from './pos.handlers';
import { returnsHandlers } from './returns.handlers';
import { disputesHandlers } from './disputes.handlers';
import { performanceHandlers } from './performance.handlers';
import { policyHandlers } from './policy.handlers';
import { brandsHandlers } from './brands.handlers';
import { shippingHandlers } from './shipping.handlers';
import { taxHandlers } from './tax.handlers';
import { pricingHandlers } from './pricing.handlers';
import { advertisingHandlers } from './advertising.handlers';
import { prescriptionHandlers } from './prescriptions.handlers';
import { zonesHandlers } from './zones.handlers';
import { adminProductsHandlers } from './admin-products.handlers';
import { settingsHandlers } from './settings.handlers';
import { rolesHandlers } from './roles.handlers';
import { reportsHandlers } from './reports.handlers';
import { ridersHandlers } from './riders.handlers';
import { searchAdminHandlers } from './search-admin.handlers';
import { customerAnalyticsHandlers } from './customer-analytics.handlers';

export const handlers = [
  ...authHandlers,
  ...vendorHandlers,
  ...recommendationsHandlers,
  ...searchHandlers,
  ...productsHandlers,
  ...storesHandlers,
  ...ordersHandlers,
  ...usersHandlers,
  ...adminHandlers,
  ...reviewsHandlers,
  ...walletHandlers,
  ...loyaltyHandlers,
  ...posHandlers,
  ...returnsHandlers,
  ...disputesHandlers,
  ...performanceHandlers,
  ...policyHandlers,
  ...brandsHandlers,
  ...shippingHandlers,
  ...taxHandlers,
  ...pricingHandlers,
  ...advertisingHandlers,
  ...prescriptionHandlers,
  ...zonesHandlers,
  ...adminProductsHandlers,
  ...settingsHandlers,
  ...rolesHandlers,
  ...reportsHandlers,
  ...ridersHandlers,
  ...searchAdminHandlers,
  ...customerAnalyticsHandlers,
];
