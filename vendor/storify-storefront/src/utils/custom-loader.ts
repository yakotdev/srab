/**
 * Custom Files Loader
 * يحمل الملفات المخصصة لكل متجر في Runtime
 */

export interface Component {
  name: string;
  path: string;
  component: any;
}

export interface Theme {
  id: string;
  name: string;
  path: string;
  config: any;
}

export interface CustomFiles {
  components: Component[];
  themes: Theme[];
}

export class CustomFilesLoader {
  /**
   * Load Custom Components
   */
  static async loadCustomComponents(storeId: string): Promise<Component[]> {
    try {
      const response = await fetch(`/api/stores/${storeId}/custom/components`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to load custom components:', error);
    }
    return [];
  }

  /**
   * Load Custom Themes
   */
  static async loadCustomThemes(storeId: string): Promise<Theme[]> {
    try {
      const response = await fetch(`/api/stores/${storeId}/custom/themes`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to load custom themes:', error);
    }
    return [];
  }

  /**
   * Load All Custom Files
   */
  static async loadAll(storeId: string): Promise<CustomFiles> {
    const [components, themes] = await Promise.all([
      this.loadCustomComponents(storeId),
      this.loadCustomThemes(storeId),
    ]);

    return {
      components,
      themes,
    };
  }
}
