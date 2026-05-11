# Grocery Scraper — Take-Home Project

## Overview

Your task is to build a TypeScript scraper that fetches all products from a real grocery store and writes them to a JSON file.

The store is a **Rouses Markets** location in Mandeville, Louisiana:

```
https://orderonline.rouses.com/online/21mandeville
```

You will be using **Puppeteer** — a Node.js library that controls a real browser — because the store's product data requires a live browser session to access.

The entry point (`src/index.ts`) is already written for you. Your job is to implement the two methods in `src/Scraper.ts`.

---

## Getting started

**Requirements:** Node.js 20 or newer.

```bash
npm install
npm start
```

Running `npm start` should eventually write an `output.json` file to the project root.

To check for TypeScript errors without running:

```bash
npm run typecheck
```

---

## What you need to implement

Open `src/Scraper.ts`. It contains a class with two methods to fill in:

### `configureApi()`

Set up everything you need before scraping can begin. This is where you should launch the Puppeteer browser and discover the API's base URL.

### `scrapeProducts()`

Fetch every product available in the store and return them as an array of JSON objects.

---

## Requirements

- `npm run typecheck` must pass with no errors
- The scraper must handle pagination — not all products come back in a single request
- The scraper should include every category in every department
- The Puppeteer browser must always be closed when the process ends (the `finally` block in `src/index.ts` calls `scraper.close()` for you — make sure your implementation supports it)

---

## Stretch goals (optional)

These are not required and will not count against you if skipped. Only attempt them if you finish the core requirements with time to spare.

- Retry a failed API request up to 3 times before giving up on that page
- Fetch per-product detail data (nutrition info, ingredients, etc.) in addition to the product listing

---

## Submitting

Send us a link to your repo (or a zip of the project folder, including git history) along with a brief note covering:

1. How you approached finding the API endpoint
2. What worked and what didn't
3. Anything you'd do differently with more time

You don't need to have a fully working scraper to submit — a partial solution with a clear explanation of your process is perfectly fine.

---

## Project structure

```
.
├── src/
│   ├── index.ts       # Entry point — already implemented, do not modify
│   └── Scraper.ts     # Your implementation goes here
├── package.json
├── tsconfig.json
└── README.md
```
