It's all in the Fetch/XHR tab when you inspect under Network!

----------------
## Part 1
----------------
Since I was not very familiar with Puppeteer, I quickly began learning what it did, and how it did what it did. Was fascinating to discover a tool like this exists. 

Next, I knew that getting data will likely come from DevTools request URL, which is often the backend/api link, and not from the website link given in the repo, so I checked the Fetch/XHR tab, where I found the request url, https://production-us-1.noq-servers.net, which will also become very important in my Part 2 of the project.

I initially faced problems because the scraper would only scrape 20 items per department instead of the up to 2k products in the actual department. This is because the scraper wasn't going into each department to pull them, and was just scraping items on the main page. Now, because Puppeteer behaves like a human browsing a website, I went back to the website to study how the website behaved, and figured that per each department, on the main page, it had 20 items at max, with a button that showed "show 693 more". When I clicked on the button, I saw more products, and when I scrolled down, I also saw that it was using lazy loading. 

All the while, I used AI to make me faster to debug and fix these issues, so I came up with a structure for the AI. Here was my structure
    - First build up the categories in the json file, as this is what we'll use to loop through and get all the products per department(fetchAllDepts function)
    - Once you get the categories, go into each of these categories and get all the products there, keeping in mind it uses lazy loading.

However, before navigating to each department page, I first had to ensure the link matches with the name, and make some formatting corrections. For example, where a department name was "Meat - Other" on the website, the link was ".../meatother" and I checked for others too and saw that the pattern was ignore all except numbers and letters, converting all to small letters. So with a regex, I formatted properly.

I also added retry logic to gracefully handle network failures and server errors. I used AI to implement this faster — my focus was on understanding the overall architecture and getting results, and I'm confident I'll deepen my knowledge of these patterns as I build more scrapers.

## Grocery Scraper Architecture
The scraper follows this structure:

Website page
    ↓
Puppeteer browser session
    ↓
Intercepted NOQ API requests
    ↓
Department discovery
    ↓
Category-level product pagination
    ↓
Normalized product JSON output





----------------
## Part 2
----------------
Initially, the "orderonline.rouses.com" domain structure was somewhat ambiguous. I could tell it was a subdomain, but "orderonline" itself was too generic to immediately reveal what third-party platform or infrastructure provider was powering the site, so I began investigating further.


I initially took the request url and pasted it to see if I'd get anything, but I hit a 404. 

Next thing I did was try to search up "site:orderonline.*.com" to see if I'll find results using the same domain with different brands, I actually started going with this, and found multiple other Rouses stores, but the requirements explicitly mentioned other stores besides the one given, so I knew just adding a bunch of additional Rouses stores wasn't the move. So I added "site:orderonline.*.com -rouses" to remove Rouses stores from the search. I did find other stores, but then I stumbled upon a store, and when I checked it, it had currency in what looked like an Indian currency symbol, so I had to reevaluate because if the requirements asked for other stores, chances are that it's asking for ones limited to the United States alone. And also that the requirements asked for stores, not restaurants, many of which I found using the "site:orderonline.*.com" search. 

So I started looking for signs of what third-party platform it was using, and I found egrowcery. I searched "egrowcery" but saw nothing more than a couple of blog/news websites -- still not relevant to the stores that need to be found. So I went back to the orderonline.rouses.com website, and checked the network tab again. I reloaded the page, and checked every request that came in upon reload. Then I clicked the summary request. I tried the summary request url directly on google and a json data showed up, showing details like franchiseId, retailer, list of stores, etc. 

So the next question then was, how do I find other stores since there's a franchiseId and all those details. So then, I searched for "powered by egrowcery" which was essentially word-for-word what was on the footer of Rouses, then skipped some Google pages to see if I'll find stores because the front page was mainly blogs, and I did, so now the next challenge was to figure out if they're being powered by the same backend api that powers the Rouses store. So in the discover.ts, for every link I got, I checked if the request url also had a ".../summary" and ".../products" and if it also had "noq-servers", as this is the same backend api that powered Rouses. This helped pinpoint exactly what websites are similar stores to Rouses. 

Before automating, I was manually adding the websites I found to a findings.json file. But then I realized it was a slow process, so I looked for ways to automate the searching and writing to a file, just as the GroceryScraper did.
I initially wanted to use Puppeteer for this, but I was getting CAPTCHA'd. So I looked to third-party APIs that could help with that, and settled with Serper.dev.
I then included the noq-servers checks into the automated flow, and all ran well.


## Store Scraper Structure
The platform appeared to follow a multi-tenant structure:

eGrowcery / NOQ infrastructure
    ↓
Franchise / Retailer
    ↓
Stores
    ↓
Products

Each retailer exposed franchise summary endpoints such as:

/api/v1/application/franchises/{id}/summary

which returned normalized store metadata and store identifiers.