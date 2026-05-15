import puppeteer, { Browser, Page } from "puppeteer";
import { 
  ApiResponse, 
  DepartmentGroup, 
  InterceptedRequest, 
  InterceptedRequestData, 
  RawProduct, 
  RequestBody 
} from "./types";


const BASE_URL = "https://production-us-1.noq-servers.net";
const STORE_ID = "514";
const STORE_URL_BASE = "https://orderonline.rouses.com/online/21mandeville/shop";
const TAKE = 40;
const ITEMS_PER_AGGREGATION = 20;
const MAX_RETRIES = 3;


function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export class GroceryScraper {
  private storeUrl: string;
  private browser: Browser | null = null;

  constructor(storeUrl: string) {
    this.storeUrl = storeUrl;
  }

  
  // Configure API
  async configureApi(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      ],
    });

    const page = await this.browser.newPage();
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    console.log("Loading store page to establish session...");
    await page.goto(this.storeUrl, { waitUntil: "networkidle2", timeout: 90_000 });
    await sleep(2000);
    await page.close();

    console.log(`  Store ID: ${STORE_ID}`);
    console.log(`  API base: ${BASE_URL}`);
  }

  // Scrape products
  async scrapeProducts(): Promise<unknown[]> {
    if (!this.browser) throw new Error("Call configureApi() first");

    // Step 1: fetch department list from /products-by-parent-category
    const firstPage = await this.fetchAllDepts();
    if (!firstPage.Result) throw new Error("No Result in first API response");

    const departments = firstPage.Result as DepartmentGroup[];
    console.log(`  Found ${departments.length} departments`);

    // Step 2: build skeleton
    const result: Record<string, { products: unknown[] }> = {};
    for (const dept of departments) {
      const name = this.getDeptName(dept);
      result[name] = { products: [] };
    }

    // Step 3: navigate to each category page, intercept the /products call,
    // then paginate via direct API calls
    for (let i = 0; i < departments.length; i++) {
      const dept = departments[i];
      const deptName = this.getDeptName(dept);
      const slug = toSlug(deptName);
      const categoryUrl = `${STORE_URL_BASE}/${slug}`;

      process.stdout.write(
        `  [${i + 1}/${departments.length}] ${deptName} (${dept.Count} total) ... `
      );

      // Navigate with Puppeteer to establish session context for this category
      const intercepted = await this.interceptCategoryRequest(categoryUrl);
      if (!intercepted) {
        console.log(`skipped (could not intercept API call)`);
        continue;
      }

      // Start with products already captured from the intercepted request
      const products: RawProduct[] = [...intercepted.data.initialProducts];
      let skip = intercepted.data.initialProducts.length;

      // Paginate until we have all products for this department
      while (products.length < dept.Count) {
        const params = new URLSearchParams({
          skip: skip.toString(),
          take: TAKE.toString(),
          sortBy: "isFeatured,rank,-savings,hasImage,name,id",
        });

        const url = `${BASE_URL}/api/v1/application/stores/${STORE_ID}/products?${params}`;
        const data = await this.getWithRetry(
          url,
          intercepted.data.headers,
          intercepted.page,
          intercepted.data.method,
          intercepted.data.requestBody
        );
        const items: RawProduct[] = (data?.Result as { Products: RawProduct[] })?.Products ?? [];

        if (items.length === 0) break;
        products.push(...items);

        if (data?.next_interval && data.next_interval > 0) {
          await sleep(data.next_interval);
        }

        skip += items.length;
      }

      result[deptName].products = products;
      console.log(`${products.length} products`);

      try {
        await intercepted.page.close();
      } catch (error) {
        // Page might already be closed, ignore the error
      }
    }

    return Object.values(result).flatMap((entry) => entry.products);
  }


  
  // Close the Puppeteer browser instance
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }


  // Navigate to category page and intercept the /products API call

  private async interceptCategoryRequest(
    categoryUrl: string
  ): Promise<InterceptedRequest | null> {
    const page = await this.browser!.newPage();
    let captured: InterceptedRequestData | null = null;

    const responsePromise = page.waitForResponse(
      (res) => {
        const url = res.url();
        return (
          url.includes("noq-servers.net") &&
          url.includes("/products") &&
          !url.includes("/products-by-parent-category") &&
          res.status() !== 204
        );
      },
      { timeout: 20_000 }
    );

    await page.goto(categoryUrl, { waitUntil: "networkidle2", timeout: 60_000 });
    await sleep(2000);

    const response = await responsePromise;
    try {
      const json = await response.json();
      const reqHeaders = response.request().headers() as Record<string, string>;

      captured = {
        initialProducts: (json?.Result as { Products: RawProduct[] })?.Products ?? [],
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-app-environment": reqHeaders["x-app-environment"] ?? "pwa",
          "x-app-version": reqHeaders["x-app-version"] ?? "v4.19.3",
        },
        method: response.request().method(),
        requestBody: response.request().postData() ?? undefined,
      };
    } catch {
      // ignore parse errors
    }

    if (!captured) {
      await page.close();
      return null;
    }

    return {
      page,
      data: captured,
    };
  }



  // Private: fetch department list
  private async fetchAllDepts(): Promise<ApiResponse> {
    const params = new URLSearchParams({
      skip: "0",
      take: "50",
      sortBy: "isFeatured,rank,-savings,hasImage,name,id",
    });

    const url = `${BASE_URL}/api/v1/application/stores/${STORE_ID}/products-by-parent-category?${params}`;
    const body: RequestBody = { itemsPerAggregation: ITEMS_PER_AGGREGATION };

    return this.fetchWithRetry(url, body);
  }


  
  // Private: GET request with retry (for paginated /products calls)
  private async getWithRetry(
    url: string,
    headers: Record<string, string>,
    page: Page,
    method: string,
    requestBody?: string
  ): Promise<ApiResponse | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await page.evaluate(
          async (url, headers, method, body) => {
            const options: Record<string, unknown> = {
              method,
              headers,
              credentials: "include",
            };
            if (method.toUpperCase() === "POST" && body) {
              options.body = body;
            }
            const res = await fetch(url, options as RequestInit);
            const text = await res.text();
            return {
              ok: res.ok,
              status: res.status,
              text,
            };
          },
          url,
          headers,
          method,
          requestBody
        );

        if (response.ok) return JSON.parse(response.text) as ApiResponse;
        if (response.status === 429 || response.status >= 500) throw new Error(`HTTP ${response.status}`);
        console.warn(`\n  ⚠ HTTP ${response.status}`);
        return null;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          const delay = 1000 * attempt;
          console.warn(`\n  ⚠ Attempt ${attempt} failed (${lastError.message}), retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    console.error(`\n  ✗ Gave up after ${MAX_RETRIES} attempts`);
    return null;
  }



  // Private: POST with retry (for /products-by-parent-category)
  private async fetchWithRetry(
    url: string,
    body: RequestBody
  ): Promise<ApiResponse> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-app-environment": "pwa",
      "x-app-version": "v4.19.3",
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (res.ok) return (await res.json()) as ApiResponse;
        if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);

        console.warn(`\n  ⚠ HTTP ${res.status}`);
        return { HasErrors: true, HasNoErrors: false };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES) {
          const delay = 1000 * attempt;
          console.warn(`\n  ⚠ Attempt ${attempt} failed (${lastError.message}), retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    console.error(`\n  ✗ Gave up after ${MAX_RETRIES} attempts`);
    return { HasErrors: true, HasNoErrors: false };
  }


  
  // Private: helpers
  private getDeptName(dept: DepartmentGroup): string {
    const firstProduct = dept.Products[0];
    if (firstProduct?.Categories) {
      const parent = firstProduct.Categories.find((c) => c.ParentCategoryId === null);
      if (parent) return parent.Name;
    }
    return dept.Id;
  }
}