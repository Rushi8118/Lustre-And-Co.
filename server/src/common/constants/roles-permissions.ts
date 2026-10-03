export type AdminRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'catalog_manager'
  | 'catalog-manager'
  | 'order_manager'
  | 'order-manager'
  | 'support_agent'
  | 'support-agent'
  | 'marketing_manager'
  | 'marketing-manager'
  | 'accountant'
  | 'customer';

export const ADMIN_ROLES: string[] = [
  'owner',
  'admin',
  'manager',
  'catalog_manager',
  'catalog-manager',
  'order_manager',
  'order-manager',
  'support_agent',
  'support-agent',
  'marketing_manager',
  'marketing-manager',
  'accountant',
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  owner: ['*'],
  admin: ['*'],
  manager: [
    'orders.read',
    'orders.update',
    'orders.export',
    'products.read',
    'products.create',
    'products.update',
    'products.delete',
    'products.export',
    'inventory.read',
    'inventory.update',
    'inventory.export',
    'shipping.read',
    'shipping.update',
    'shipping.create',
    'returns.read',
    'returns.update',
    'returns.refund',
    'invoices.read',
    'invoices.create',
    'invoices.download',
    'customers.read',
    'customers.update',
    'customers.export',
    'marketing.read',
    'marketing.create',
    'marketing.update',
    'marketing.send',
    'analytics.read',
    'analytics.export',
    'discounts.read',
    'discounts.create',
    'discounts.update',
    'reviews.read',
    'reviews.update',
    'reviews.delete',
    'settings.read',
    'audit.read',
  ],
  catalog_manager: [
    'products.read',
    'products.create',
    'products.update',
    'products.delete',
    'products.export',
    'inventory.read',
    'reviews.read',
    'reviews.update',
    'discounts.read',
  ],
  'catalog-manager': [
    'products.read',
    'products.create',
    'products.update',
    'products.delete',
    'products.export',
    'inventory.read',
    'reviews.read',
    'reviews.update',
    'discounts.read',
  ],
  order_manager: [
    'orders.read',
    'orders.update',
    'orders.export',
    'shipping.read',
    'shipping.update',
    'shipping.create',
    'returns.read',
    'returns.update',
    'invoices.read',
    'invoices.download',
    'customers.read',
  ],
  'order-manager': [
    'orders.read',
    'orders.update',
    'orders.export',
    'shipping.read',
    'shipping.update',
    'shipping.create',
    'returns.read',
    'returns.update',
    'invoices.read',
    'invoices.download',
    'customers.read',
  ],
  support_agent: [
    'orders.read',
    'customers.read',
    'returns.read',
    'returns.update',
    'reviews.read',
    'invoices.read',
    'invoices.download',
  ],
  'support-agent': [
    'orders.read',
    'customers.read',
    'returns.read',
    'returns.update',
    'reviews.read',
    'invoices.read',
    'invoices.download',
  ],
  marketing_manager: [
    'marketing.read',
    'marketing.create',
    'marketing.update',
    'marketing.send',
    'analytics.read',
    'analytics.export',
    'discounts.read',
    'discounts.create',
    'discounts.update',
    'customers.read',
    'reviews.read',
  ],
  'marketing-manager': [
    'marketing.read',
    'marketing.create',
    'marketing.update',
    'marketing.send',
    'analytics.read',
    'analytics.export',
    'discounts.read',
    'discounts.create',
    'discounts.update',
    'customers.read',
    'reviews.read',
  ],
  accountant: [
    'orders.read',
    'orders.export',
    'invoices.read',
    'invoices.create',
    'invoices.download',
    'returns.read',
    'analytics.read',
    'analytics.export',
    'customers.read',
  ],
  customer: [],
};

export function hasPermission(
  role: string | undefined,
  userCustomPermissions: string[] | undefined,
  requiredPermission: string,
): boolean {
  if (!role) return false;

  const normalizedRole = role.toLowerCase().trim();
  const defaultPerms = ROLE_DEFAULT_PERMISSIONS[normalizedRole] || [];
  const customPerms = Array.isArray(userCustomPermissions) ? userCustomPermissions : [];
  const allPerms = new Set([...defaultPerms, ...customPerms]);

  if (allPerms.has('*')) return true;
  if (allPerms.has(requiredPermission)) return true;

  // Check wildcard prefix (e.g. "orders.*" matches "orders.read")
  const [resource] = requiredPermission.split('.');
  if (allPerms.has(`${resource}.*`)) return true;

  return false;
}
