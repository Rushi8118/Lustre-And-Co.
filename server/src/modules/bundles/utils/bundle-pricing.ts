import {
  BundlePriceBreakdown,
  ProductBundle,
  ProductBundleItem,
  SelectedBundleItem,
} from '../schemas/product-bundle.schema.js';

interface ProductRecord {
  id: string;
  name: string;
  price: number;
  stockQuantity?: number;
  availability?: string;
}

export function isBundleCurrentlyActive(
  bundle: ProductBundle,
  now = new Date(),
): boolean {
  if (!bundle.isActive) return false;

  if (bundle.startsAt && new Date(bundle.startsAt) > now) {
    return false;
  }

  if (bundle.endsAt && new Date(bundle.endsAt) < now) {
    return false;
  }

  return true;
}

export function normalizeSelectedItems(
  bundle: ProductBundle,
  selectedItems?: SelectedBundleItem[],
): SelectedBundleItem[] {
  const configured = bundle.items || [];

  if (bundle.bundleType !== 'mix_and_match') {
    return configured.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      groupKey: item.groupKey || null,
    }));
  }

  const requested = selectedItems || [];

  const allowedIds = new Set(configured.map((item) => item.productId));
  const totals = new Map<string, SelectedBundleItem>();

  for (const item of requested) {
    if (!allowedIds.has(item.productId)) continue;

    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
    if (!quantity) continue;

    const existing = totals.get(item.productId);

    totals.set(item.productId, {
      productId: item.productId,
      quantity: (existing?.quantity || 0) + quantity,
      groupKey: item.groupKey || null,
    });
  }

  return [...totals.values()];
}

export function validateBundleSelection(
  bundle: ProductBundle,
  selectedItems: SelectedBundleItem[],
): void {
  const minimum = Math.max(1, Number(bundle.minItems || 1));
  const maximum = bundle.maxItems
    ? Math.max(minimum, Number(bundle.maxItems))
    : null;

  const totalItems = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  if (totalItems < minimum) {
    throw new Error(
      `Select at least ${minimum} item${minimum === 1 ? '' : 's'} for this bundle.`,
    );
  }

  if (maximum && totalItems > maximum) {
    throw new Error(
      `You can select at most ${maximum} items for this bundle.`,
    );
  }

  const configuredByProduct = new Map(
    bundle.items.map((item) => [item.productId, item]),
  );

  for (const selected of selectedItems) {
    const configured = configuredByProduct.get(selected.productId);

    if (!configured) {
      throw new Error('One or more selected products are not part of this bundle.');
    }

    if (bundle.bundleType !== 'mix_and_match') {
      const expectedQuantity = configured.quantity;

      if (selected.quantity !== expectedQuantity) {
        throw new Error(
          `Invalid quantity for product ${selected.productId}.`,
        );
      }
    }
  }

  const requiredItems = bundle.items.filter((item) => item.isRequired);

  for (const required of requiredItems) {
    const selected = selectedItems.find(
      (item) => item.productId === required.productId,
    );

    if (!selected || selected.quantity < required.quantity) {
      throw new Error(
        `Required product ${required.productId} is missing from the bundle.`,
      );
    }
  }
}

export function validateBundleStock(
  bundle: ProductBundle,
  selectedItems: SelectedBundleItem[],
  productsById: Map<string, ProductRecord>,
  bundleQuantity: number,
): void {
  for (const selected of selectedItems) {
    const product = productsById.get(selected.productId);

    if (!product) {
      throw new Error(`Product ${selected.productId} was not found.`);
    }

    if (product.availability === 'out-of-stock') {
      throw new Error(`${product.name} is out of stock.`);
    }

    const requiredStock = selected.quantity * bundleQuantity;
    const availableStock = Number(product.stockQuantity ?? 0);

    if (availableStock < requiredStock) {
      throw new Error(
        `${product.name} has only ${availableStock} item(s) available.`,
      );
    }
  }
}

export function calculateBundlePrice(
  bundle: ProductBundle,
  selectedItems: SelectedBundleItem[],
  productsById: Map<string, ProductRecord>,
  bundleQuantity = 1,
): BundlePriceBreakdown {
  const items = selectedItems.map((selected) => {
    const product = productsById.get(selected.productId);

    if (!product) {
      throw new Error(`Product ${selected.productId} was not found.`);
    }

    return {
      productId: product.id,
      name: product.name,
      quantity: selected.quantity * bundleQuantity,
      unitPrice: Number(product.price || 0),
      total:
        Number(product.price || 0) *
        selected.quantity *
        bundleQuantity,
    };
  });

  const originalTotal = items.reduce((sum, item) => sum + item.total, 0);

  let discountTotal = 0;

  if (bundle.discountType === 'percentage') {
    discountTotal = originalTotal * (Number(bundle.discountValue || 0) / 100);
  }

  if (bundle.discountType === 'fixed') {
    discountTotal = Number(bundle.discountValue || 0) * bundleQuantity;
  }

  if (bundle.discountType === 'free_item') {
    const freeQuantity = Math.max(1, Number(bundle.getQuantity || 1));
    const buyQuantity = Math.max(1, Number(bundle.buyQuantity || 1));

    const cheapestUnitPrice = items.length
      ? Math.min(...items.map((item) => item.unitPrice))
      : 0;

    const freeUnits = Math.min(
      freeQuantity * bundleQuantity,
      Math.floor(originalTotal / Math.max(1, buyQuantity)),
    );

    discountTotal = cheapestUnitPrice * freeUnits;
  }

  discountTotal = Math.min(Math.max(discountTotal, 0), originalTotal);

  const finalTotal = Math.max(0, originalTotal - discountTotal);
  const originalUnitPrice = originalTotal / Math.max(1, bundleQuantity);
  const finalUnitPrice = finalTotal / Math.max(1, bundleQuantity);
  const discountPerUnit = discountTotal / Math.max(1, bundleQuantity);

  return {
    bundleId: bundle.id,
    bundleName: bundle.name,
    quantity: bundleQuantity,
    originalUnitPrice,
    discountPerUnit,
    finalUnitPrice,
    originalTotal,
    discountTotal,
    finalTotal,
    items,
  };
}
