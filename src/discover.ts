import axios from "axios";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import "dotenv/config";

const SEARCH_QUERY = '"Powered by eGrowcery"';

const START_OFFSET = 12;
const RESULTS_PER_PAGE = 10;
const MAX_PAGES_TO_FETCH = 10;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeToHome(rawLink: string): string | null {
  try {
    const url = new URL(rawLink);
    const match = url.pathname.match(/^(\/online\/[^/]+)\/?/);

    if (!match) return null;

    return `${url.origin}${match[1]}/home`;
  } catch {
    return null;
  }
}

async function searchSerperPage(page: number): Promise<any[]> {
  const response = await axios.post(
    "https://google.serper.dev/search",
    {
      q: SEARCH_QUERY,
      page,
      num: RESULTS_PER_PAGE,
    },
    {
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.organic ?? [];
}

async function getAllRetailerUrls(): Promise<string[]> {
  const allUrls = new Set<string>();

  const startPage = Math.floor(START_OFFSET / RESULTS_PER_PAGE) + 1;
  const localOffset = START_OFFSET % RESULTS_PER_PAGE;

  const endPage = startPage + MAX_PAGES_TO_FETCH - 1;

  for (let page = startPage; page <= endPage; page++) {
    console.log(`Searching Serper page ${page}...`);

    let results = await searchSerperPage(page);

    if (page === startPage) {
      results = results.slice(localOffset);
    }

    if (results.length === 0) break;

    for (const item of results) {
      if (!item.link) continue;

      const normalized = normalizeToHome(item.link);

      if (normalized && normalized.includes("/online/")) {
        allUrls.add(normalized);
      }
    }

    await sleep(1000);
  }

  return [...allUrls];
}


async function extractSummaryUrl(pageUrl: string): Promise<string | null> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const foundUrls = new Set<string>();

  page.on("request", (request) => {
    const url = request.url();

    if (
      url.includes("noq-servers.net/api/v1/application/franchises/") &&
      url.includes("/summary")
    ) foundUrls.add(url);
  });

  try {
    await page.goto(pageUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await sleep(2500);
  } catch {
    console.error(`Failed loading ${pageUrl}`);
  }

  await browser.close();
  return [...foundUrls][0] ?? null;
}

async function fetchSummary(summaryUrl: string): Promise<any> {
  const response = await axios.get(summaryUrl);
  return response.data;
}


async function main() {
  if (!process.env.SERPER_API_KEY) {
    throw new Error(
      "Missing SERPER_API_KEY in .env"
    );
  }

  const retailerUrls =
    await getAllRetailerUrls();

  console.log(
    `\nFound ${retailerUrls.length} unique retailer URLs`
  );

  const output: any[] = [];

  const seenFranchiseIds =
    new Set<string>();

  for (const retailerUrl of retailerUrls) {
    console.log(`\nInspecting ${retailerUrl}`);

    const summaryUrl =
      await extractSummaryUrl(retailerUrl);

    if (!summaryUrl) {
      console.log("No summary URL found");
      continue;
    }

    const franchiseMatch = summaryUrl.match(/franchises\/(\d+)\/summary/);

    const franchiseId = franchiseMatch?.[1] ?? null;

    if (!franchiseId) {
      console.log("No franchise ID found");
      continue;
    }

    if (seenFranchiseIds.has(franchiseId)) {
      console.log(`Duplicate franchise ${franchiseId}, skipping`);
      continue;
    }

    seenFranchiseIds.add(franchiseId);

    const summary = await fetchSummary(summaryUrl);

    const retailerName = summary?.Result?.Name ?? null;

    const stores =
      summary?.Result?.Stores?.map(
        (store: any) => ({
          storeName: store.Name,
          address: store.Address,
          availabilityMode: store.AvailabilityMode,
        })
      ) ?? [];

    output.push({
      retailerName,
      retailerUrl,
      summaryUrl,
      franchiseId,
      stores,
    });

    console.log(`Saved ${stores.length} stores for ${retailerName}`);
    await sleep(1500);
  }

  await fs.writeFile(
    "research/findings.json",
    JSON.stringify(output,null,2)
  );

  console.log(`\nDone. Saved ${output.length} retailers`);
}

main().catch(console.error);