function $hostname(url) {
  const parsedURL = new URL(url);
  const siteName = parsedURL.hostname.split('.')[1];
  return siteName?.charAt(0).toUpperCase() + siteName.slice(1);
}

module.exports = $hostname;