export { users, credentials } from './users';
export { stores } from './stores';
export { products, productsByStore, productsByCategory } from './products';
export { categories } from './categories';
export { orders } from './orders';
export { addresses } from './addresses';
export { zones } from './zones';
export { adminDashboard, vendorDashboard, vendorAnalyticsMock, accountingMockData, vendorStatsMock, vendorFinancials, settlementItems } from './dashboard';
export type { MockSettlement, MockSettlementItem } from './dashboard';
export { coupons } from './coupons';
export { reviews, reviewHelpfulVotes } from './reviews';
export {
  loyaltyAccount,
  loyaltyTransactions,
  walletBalance,
  walletTransactions,
  adminLoyaltyAccounts,
  adminLoyaltyStats,
} from './loyalty';
export {
  posTerminals,
  posShifts,
  posTransactions,
  posCashMovements,
  posReceipts,
  posSalesSummary,
  posProductSales,
  posHourlySales,
  posPaymentBreakdown,
} from './pos';
export { brands, computeBrandStats } from './brands';
export type { MockBrand, MockBrandStats, BrandStatus } from './brands';
export { returnRequests, computeReturnStats } from './returns';
export { disputes, computeDisputeStats } from './disputes';
export {
  performanceMetrics,
  performanceBenchmarks,
  generatePerformanceHistory,
} from './performance';
export {
  policyRules,
  policyViolations,
  policyAppeals,
  computeViolationStats,
  computeAppealStats,
} from './policy';
export type {
  MockPolicyRule,
  MockPolicyViolation,
  MockAppeal,
  MockViolationStats,
  MockAppealStats,
  PolicyCategory,
  PolicySeverity,
  PenaltyType,
  ViolationStatus,
  DetectedBy,
  AppealStatus,
} from './policy';
export {
  shippingCarriers,
  carrierServices,
  shipments,
  computeShipmentStats,
} from './shipping';
export type {
  MockShippingCarrier,
  MockCarrierService,
  MockShipment,
  MockShipmentStats,
  CarrierType,
  ShipmentStatus,
} from './shipping';
export {
  taxConfigs,
  taxInvoices,
  taxReports,
  computeInvoiceStats,
  computeReportStats,
  computeVendorTaxSummary,
} from './tax';
export type {
  MockTaxConfig,
  MockTaxInvoice,
  MockTaxReport,
  TaxInvoiceStats,
  TaxReportStats,
  VendorTaxSummary,
  TaxType,
  TaxAppliesTo,
  InvoiceType,
  InvoiceStatus,
  ReportType,
  ReportStatus,
  PeriodType,
} from './tax';
export {
  pricingRules,
  priceHistory,
  computePricingStats,
} from './pricing';
export type {
  MockPricingRule,
  MockPriceHistory,
  MockPricingStats,
  PricingRuleType,
  PricingDiscountType,
  PricingAppliesTo,
  PricingRuleStatus,
  PriceChangeType,
  PricingSchedule,
  PricingConditions,
} from './pricing';
export { mockPrescriptions } from './prescriptions';
export type { MockPrescription } from './prescriptions';
export { platformSettings, featureFlags as settingsFeatureFlags } from './settings';
export type {
  PlatformSettings,
  GeneralSettings,
  CommerceSettings,
  PaymentSettings,
  SecuritySettings,
  NotificationSettings,
  FeatureFlag,
} from './settings';
export { adminRoles, adminUsers, permissionGroups, allPermissionKeys } from './roles';
export type { AdminRole, AdminUser, PermissionGroup, Permission } from './roles';
export {
  campaigns,
  campaignProducts,
  computeCampaignStats,
  computePlatformAdStats,
  generateCampaignPerformance,
} from './advertising';
export type {
  MockCampaign,
  MockCampaignProduct,
  MockCampaignPerformance,
  MockCampaignStats,
  MockPlatformAdStats,
  CampaignType,
  CampaignStatus,
  BudgetType,
  BidType,
  AdPlacement,
  CampaignTargeting,
} from './advertising';
export {
  financialReport,
  auditLogEntries,
  computeAuditLogStats,
} from './reports';
export type {
  MockFinancialReport,
  MockAuditLogEntry,
  AuditLogStats,
  RevenueSummary,
  RevenueByPeriod,
  RevenueByCategory,
  RevenueByZone,
  RevenueByPaymentMethod,
  SettlementSummary,
  FeeSummary,
  RefundSummary,
  AuditChange,
  AuditActionType,
  AuditResourceType,
  ReportPeriod,
  RevenueCategory,
  RefundReason,
} from './reports';
export { riders, computeRiderStats } from './riders';
export type {
  MockRider,
  MockRiderStats,
  RiderStatus,
  VehicleType,
} from './riders';
export {
  searchSynonyms,
  boostRules,
  searchAnalytics,
  indexHealth,
} from './search-admin';
export type {
  SearchSynonym,
  BoostRule,
  TopQuery,
  ZeroResultQuery,
  SearchAnalytics,
  IndexHealth,
} from './search-admin';
export {
  customerOverview,
  demographics,
  acquisitionChannels,
  retentionCohorts,
  customerSegments,
  customerGrowth,
} from './customer-analytics';
export type {
  CustomerOverview,
  DemographicBreakdown,
  AcquisitionChannel,
  RetentionCohort,
  CustomerSegment,
  CustomerGrowth,
} from './customer-analytics';
