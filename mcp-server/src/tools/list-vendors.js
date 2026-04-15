import { vendors } from '../vendors/index.js';

/**
 * list_vendors — returns all supported vendors with their categories.
 */
export function listVendors() {
  return {
    vendors: Object.values(vendors).map(v => ({
      id: v.id,
      name: v.name,
      base_url: v.base_url,
      categories: Object.keys(v.category_urls || {}),
    })),
  };
}
