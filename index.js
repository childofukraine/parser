const bodyParser = require('body-parser');
const express = require('express');
const puppeteer = require('puppeteer-extra');
const $extractor = require('./utils/extractor');
const $currency = require('./utils/currency');
const $hostname = require('./utils/hostname');
const cors = require('cors');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const app = express();
const port = 8080;

app.use(cors());
app.use(bodyParser.json());
puppeteer.use(StealthPlugin());

app.post('/', async (req, res) => {
  const url = req.body.url;
  const response = await parse(url);
  res.json(response)
  process.exit()
});

app.listen(port, () => {
  console.log(`Listening on port ${port} (v0.5)`);
});

const defaultHeaders = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'upgrade-insecure-requests': '1',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'en-US,en;q=0.9,en;q=0.8',
};

class PageParser {
  constructor(page) {
    this.page = page;
  }

  fixImageUrl(url) {
    if (url) {
      // Remove leading slashes
      url = url.replace(/^\/+/, '');

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Add 'https://' as a default protocol
        url = 'https://' + url;
      }
    }
    return url;
  }

  async extractJsonLD() {
    try {
      return await this.page.evaluate(() => {
        const ldJsonScript = Array.from(
          document.querySelectorAll('script[type="application/ld+json"]')
        );
        return ldJsonScript?.map((script) => JSON.parse(script.textContent));
      });
    } catch (error) {
      console.error('Error parsing JSON LD:', error.message);
      return null;
    }
  }

  async extractImage() {
    const linkTag = await this.page.$('link[rel="preload"][as="image"]');
    const schema = await this.extractJsonLD();

    try {
      if (linkTag) {
        const attributes = await this.page.evaluate((link) => {
          const imageFormats = ['.jpg', '.jpeg', '.png', '.webp'];
          const attributes = {};

          for (const attr of link.attributes) {
            if (imageFormats.some((format) => attr.value.includes(format))) {
              attributes[attr.name] = attr.value;
            }
          }

          return attributes;
        }, linkTag);

        if (attributes.href) {
          return attributes.href;
        }
      }
    } catch (error) {
      console.error(
        'Error extracting attributes using linkTag:',
        error.message
      );
    }

    const image = $extractor(schema, 'image').image;
    if (image && image !== 'N/A') {
      return image;
    }

    // If both methods fail, return null or handle it as needed
    return null;
  }

  async extractMetadataTags() {
    try {
      return await this.page.evaluate(() => {
        const metadataTags = [
          'twitter:image',
          'og:image',
          'og:price',
          'og:currency',
          'og:price:amount',
          'og:price:currency',
          'product:price.amount',
          'product:price.currency',
        ];
        const extractedTags = {};

        for (const tag of metadataTags) {
          const tagElement = document.querySelector(
            `meta[property="${tag}"], meta[name="${tag}"]`
          );
          if (tagElement) {
            extractedTags[tag] = tagElement.getAttribute('content');
          }
        }

        return extractedTags;
      });
    } catch (error) {
      console.error('Error extracting metadata tags:', error.message);
      return null;
    }
  }

  async parse() {
    const schema = await this.extractJsonLD();

    // If no application/json+ld, try extracting from metadata tags
    const metadataTags = await this.extractMetadataTags();

    let metaObj = {
      title: await this.page.title(),
      brand: $hostname(this.page.url()),
    };

    // Use metadata tags if available
    if (metadataTags && Object.keys(metadataTags).length > 0) {
      metaObj = {
        title: await this.page.title(),
        brand: $hostname(this.page.url()),
        href:
          (await this.extractImage()) ||
          this.fixImageUrl(
            metadataTags['twitter:image'] || metadataTags['og:image']
          ) ||
          '',
        currency:
          (await this.extractCurrency(schema)) ||
          metadataTags['og:currency'] ||
          metadataTags['og:price:currency'] ||
          'N/A',
        price:
          (await this.extractPrice(schema)) ||
          metadataTags['og:price'] ||
          metadataTags['og:price:amount'] ||
          'N/A',
      };
    }

    return {
      title: metaObj.title,
      brand: metaObj.brand,
      href: this.fixImageUrl(metaObj.href) || '',
      currency: $currency(metaObj.currency) || 'N/A',
      price: metaObj.price || 'N/A',
    };
  }

  extractCurrency(schema) {
    return this.findValue(schema, 'priceCurrency');
  }

  extractPrice(schema) {
    return this.findValue(schema, 'price');
  }

  findValue(obj, key) {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    if (key in obj) {
      return obj[key];
    }

    for (const prop in obj) {
      const value = this.findValue(obj[prop], key);
      if (value !== null) {
        return value;
      }
    }

    return null;
  }
}

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
    await page.setExtraHTTPHeaders(defaultHeaders);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.screenshot({
      path: 'tjmax.png',
    });

    const parser = new PageParser(page);
    const result = await parser.parse();

    await page.close()
    await browser.close();

    return result;
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}
