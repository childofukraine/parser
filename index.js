const bodyParser = require("body-parser");
const express = require("express");
const puppeteer = require("puppeteer-core");
const cors = require("cors");

const app = express();
const port = 8080;

app.use(cors());
app.use(bodyParser.json());

app.post("/", async (req, res) => {
  const url = req.body.url;
  const response = await parse(url);
  res.json(response);
});

app.listen(port, () => {
  console.log("listening on port 8080 (test cors)");
});

const _headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
  "upgrade-insecure-requests": "1",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "accept-encoding": "gzip, deflate, br",
  "accept-language": "en-US,en;q=0.9,en;q=0.8",
};

function extractBrandAndImage(schema) {
  if (schema && Array.isArray(schema)) {
    const firstProduct = schema[0];

    if (firstProduct) {
      const brand =
        typeof firstProduct.brand === "object"
          ? firstProduct.brand.name
          : typeof firstProduct.brand === "string"
          ? firstProduct.brand
          : "";

      const image = Array.isArray(firstProduct.image)
        ? firstProduct.image[0]
        : typeof firstProduct.image === "string"
        ? firstProduct.image
        : "";

      return { brand, image };
    }
  }

  return { brand: "N/A", image: "N/A" };
}

async function parse(url) {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/usr/bin/chromium-browser",
      ignoreDefaultArgs: ["--disable-extensions"],
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: {
        width: 1366,
        height: 1024,
      },
    });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders(_headers);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const schema = await page.evaluate(() => {
      const ldJsonScript = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );
      return ldJsonScript.map((script) => JSON.parse(script.textContent));
    });

    const title = await page.title();
    const brand = extractBrandAndImage(schema).brand;
    const href = extractBrandAndImage(schema).image;
    const description = await page.$eval(
      "head > meta[name='description']",
      (element) => element.content
    );

    await browser.close();

    return {
      title,
      href,
      brand,
      description,
    };
  } catch (error) {
    console.error("Error:", error.message);
  }
}
