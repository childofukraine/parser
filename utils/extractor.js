const $currency = require('./currency');

function $extractor(schema) {
  function extractBrandName(brand) {
    if (!brand) {
      return 'N/A';
    }

    if (typeof brand === 'object') {
      return brand.name || 'N/A';
    }

    return String(brand);
  }

  function findValue(obj, key) {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    if (key in obj) {
      return obj[key];
    }

    for (const prop in obj) {
      const value = findValue(obj[prop], key);
      if (value !== null) {
        return value;
      }
    }

    return null;
  }

  const brand = extractBrandName(findValue(schema, 'brand'));
  const price = findValue(schema, 'price');
  const currency = findValue(schema, 'priceCurrency');
  let image = findValue(schema, 'image');

  if (Array.isArray(image)) {
    image = image.length > 0 ? image[0] : null;
  }

  return {
    brand,
    image: image || 'N/A',
    price: price || 'N/A',
    currency: $currency(currency) || currency || 'N/A',
  };
}

module.exports = $extractor;
