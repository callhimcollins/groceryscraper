import puppeteer, { Browser } from "puppeteer";

export class GroceryScraper {
  private storeUrl: string;
  private browser: Browser | null = null;

  constructor(storeUrl: string) {
    this.storeUrl = storeUrl;
  }

  /**
   * Launch the browser and discover/setup anything needed before scraping.
   */
  async configureApi(): Promise<void> {
    // TODO: implement
    throw new Error("configureApi() not implemented");
  }

  /**
   * Fetch all products from the store.
   */
  async scrapeProducts(): Promise<unknown[]> {
    // TODO: implement
    throw new Error("scrapeProducts() not implemented");
  }

  /**
   * Close the Puppeteer browser. Called automatically by index.ts.
   * Make sure this always runs, even if scraping fails.
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
