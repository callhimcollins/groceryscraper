# Part 2 — Platform Research

Now that you've built a scraper for a Rouses Markets location, your next task mirrors how we actually approach scraper expansion at Thrivvy.

## Background

The Rouses store you scraped in Part 1 runs on a third-party e-commerce platform. That same platform powers online grocery storefronts for other retailers too — some you'd recognize, some you wouldn't. Our job is to find all of them.

## Your task

Identify every grocery retailer and store location currently using this platform.

For each store you find, capture:

- Retailer name
- Store name or location (e.g. city, store number, or however the store identifies itself)
- Store URL

## Deliverable

Add a `research/` folder to your repo containing two files:

**`research/findings.json`** — a structured list of every store you found, e.g.:

```json
[
  {
    "retailer": "Retailer Name",
    "store": "Store Name or Location",
    "url": "https://..."
  }
]
```

**`research/approach.md`** — a short writeup (a few sentences to a paragraph) covering:

1. How you identified that other retailers were on this platform
2. What signals or patterns you used to enumerate stores
3. Any gaps or limitations in your approach — stores you think you may have missed, and what you'd do to find them

## What we're evaluating

We care more about methodology than completeness. A well-explained approach that finds 80% of stores is more valuable to us than a full list with no explanation of how you got there. Be honest about where your method breaks down.

This is the same kind of thinking we use when we're deciding whether to expand a scraper to a new retailer — figure out who's on the platform, map the store landscape, then prioritize.
