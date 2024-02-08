function $hostname(url) {
  try {
    const urlObj = new URL(url);
    const hostnameParts = urlObj.hostname.split('.');
    // Check if the hostname has at least two parts
    if (hostnameParts.length >= 2) {
      // Capitalize the first letter of the sitename
      const sitename = hostnameParts[1];
      return sitename.charAt(0).toUpperCase() + sitename.slice(1);
    } else {
      // If the hostname has only one part, return it
      return urlObj.hostname;
    }
  } catch (error) {
    console.error('Error extracting sitename:', error);
    return '';
  }
}

module.exports = $hostname;
