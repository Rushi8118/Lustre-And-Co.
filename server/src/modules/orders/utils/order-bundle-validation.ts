import { BadRequestException } from '@nestjs/common';
import { BundlesService } from '../../bundles/bundles.service.js';

export async function validateOrderBundles(
  bundlesService: BundlesService,
  bundleItems: any[],
) {
  if (!Array.isArray(bundleItems) || bundleItems.length === 0) {
    return {
      bundles: [],
      bundleTotal: 0,
    };
  }

  const validated = [];

  for (const item of bundleItems) {
    if (!item?.bundleId) {
      throw new BadRequestException(
        'Invalid bundle line in order.',
      );
    }

    const result = await bundlesService.validateBundle(
      item.bundleId,
      Number(item.quantity || 1),
      item.selectedItems,
    );

    validated.push(result);
  }

  return {
    bundles: validated,
    bundleTotal: validated.reduce(
      (sum, item) => sum + item.price.finalTotal,
      0,
    ),
  };
}
