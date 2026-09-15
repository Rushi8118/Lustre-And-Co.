import type { Doc } from '../../../common/utils/db.js';

/** Singleton row (key = "store") holding all admin-editable storefront configuration. */
export interface Settings {
  key: string;
  store: Record<string, any>;
  social: Record<string, any>;
  commerce: Record<string, any>;
  announcement: Record<string, any>;
  homepage: Record<string, any>;
  newsletter: Record<string, any>;
  seo: Record<string, any>;
}

export type SettingsDocument = Doc<Settings>;
