const bodyParser = require('body-parser');
const express = require('express');
const puppeteer = require('puppeteer');
const $extractor = require('./utils/extractor');
const $currency = require('./utils/currency');
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
  console.log(`Listening on port ${port} (test cors)`);
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

  async parse() {
    const schema = await this.extractJsonLD();
    const image = await this.extractImage();
    const currency = this.extractCurrency(schema);
    const price = this.extractPrice(schema);

    return {
      title: await this.page.title(),
      brand: $hostname(this.page.url()),
      href: this.fixImageUrl(image) || '',
      currency: currency || 'N/A',
      price: price || 'N/A',
    };
  }

  extractCurrency(schema) {
    return $currency(this.findValue(schema, 'priceCurrency'));
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

function extractImageUrl(image) {
  if (Array.isArray(image)) {
    const urlFromObjects = image
      .map((img) => {
        if (img && typeof img === 'object') {
          const urlKey = Object.keys(img).find((key) =>
            key.toLowerCase().includes('url')
          );
          return urlKey ? img[urlKey] : null;
        }
        return null;
      })
      .filter(Boolean);

    return urlFromObjects.length > 0 ? urlFromObjects[0] : 'N/A';
  }

  if (typeof image === 'object') {
    // Try to find a key that includes 'url'
    const urlKey = Object.keys(image).find((key) =>
      key.toLowerCase().includes('url')
    );
    return urlKey ? image[urlKey] : 'N/A';
  }

  return typeof image === 'string' ? image : 'N/A';
}

async function parse(url) {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
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

    const parser = new PageParser(page);
    const result = await parser.parse();

    await browser.close();

    console.log(result);
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}

parse(
  'https://www.macys.com/shop/product/max-olivia-big-girls-top-pants-with-scrunchie-3-piece-set?ID=16440806'
);
