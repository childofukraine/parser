function $hostname(url) {
  const hostnameRegex = /^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i;
  const match = url.match(hostnameRegex);
  if (match) {
    const siteName = match[1].split('.')[0]; // Extract the first part of the hostname
    return siteName.charAt(0).toUpperCase() + siteName.slice(1); // Capitalize the first letter
  }
  return '';
}

module.exports = $hostname;
