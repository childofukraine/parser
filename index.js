const bodyParser = require('body-parser');
const express = require('express');
const puppeteer = require('puppeteer-core');
const $extractor = require('./utils/extractor');
const $hostname = require('./utils/hostname');
const cors = require('cors');

const app = express();
const port = 8080;

app.use(cors());
app.use(bodyParser.json());

app.post('/', async (req, res) => {
  const url = req.body.url;
  const response = await parse(url);
  res.json(response);
});

app.listen(port, () => {
  console.log('listening on port 8080 (test cors)');
});

const _headers = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'upgrade-insecure-requests': '1',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'en-US,en;q=0.9,en;q=0.8',
};

async function parse(url) {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/usr/bin/chromium-browser',
      ignoreDefaultArgs: ['--disable-extensions'],
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: {
        width: 1366,
        height: 1024,
      },
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders(_headers);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const schema = await page.evaluate(() => {
      const ldJsonScript = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );
      return ldJsonScript.map((script) => JSON.parse(script.textContent));
    });

    const title = await page.title();
    const brand = $hostname(url);
    const href = $extractor(schema).image;
    const currency = $extractor(schema).currency;
    const price = $extractor(schema).price;

    await browser.close();

    return {
      title,
      href,
      brand,
      currency,
      price,
    };
  } catch (error) {
    console.error('Error:', error.message);
  }
}
