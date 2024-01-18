const $currency = require('./currency');

function $extractor(schema) {
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

  const price = findValue(schema, 'price');
  const currency = findValue(schema, 'priceCurrency');
  const image = extractImageUrl(findValue(schema, 'image'));

  return {
    image: image || undefined,
    price: price || undefined,
    currency: $currency(currency) || currency || undefined,
  };
}

module.exports = $extractor;
