import * as fs from "fs";
import * as path from "path";
import { GroceryScraper } from "./GroceryScraper";

const STORE_URL = "https://orderonline.rouses.com/online/21mandeville";
const OUTPUT_FILE = path.join(process.cwd(), "output.json");

async function main() {
  const scraper = new GroceryScraper(STORE_URL);

  try {
    console.log("Configuring scraper...");
    await scraper.configureApi();

    console.log("Scraping products...");
    const products = await scraper.scrapeProducts();

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2));
    console.log(`Done. Wrote ${products.length} products to output.json`);
  } catch (err) {
    console.error("Scrape failed:", err);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main();
