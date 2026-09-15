import type { Doc } from '../../../common/utils/db.js';

export interface Category {
  name: string;
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
  showInMenu: boolean;
  showOnHome: boolean;
}

export type CategoryDocument = Doc<Category>;
