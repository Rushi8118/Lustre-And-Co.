export interface TemplateContext {
  [key: string]: unknown;
}

export const SUPPORTED_TEMPLATE_VARIABLES = [
  'customerName',
  'orderNumber',
  'trackingLink',
  'storeName',
  'storeUrl',
  'unsubscribeLink',
  'productName',
  'productImage',
  'productUrl',
  'discountCode',
  'discountPercent',
  'reviewLink',
  'cartLink',
  'shippingStatus',
];

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderTemplate(
  template: string,
  context: TemplateContext,
  html = false,
): string {
  return String(template || '').replace(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
    (_match, variable: string) => {
      const value = context[variable] ?? '';

      return html ? escapeHtml(value) : String(value);
    },
  );
}

export function getTemplateVariables(
  template: string,
): string[] {
  const variables = new Set<string>();

  for (const match of String(template || '').matchAll(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
  )) {
    variables.add(match[1]);
  }

  return [...variables];
}
