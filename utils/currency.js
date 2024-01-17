const $extractor = require('./extractor');

function $currency(currencyCode) {
  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'CA$',
    CHF: 'CHF',
    CNY: 'CN¥',
    SEK: 'SEK',
    NZD: 'NZ$',
    INR: '₹',
    BRL: 'R$',
    RUB: '₽',
    ZAR: 'R',
    MXN: 'Mex$',
    SGD: 'S$',
    HKD: 'HK$',
    NOK: 'NOK',
    TRY: '₺',
    KRW: '₩',
    IDR: 'Rp',
    MYR: 'RM',
    THB: '฿',
    PHP: '₱',
    PLN: 'zł',
    HUF: 'HUF',
    CZK: 'CZK',
    DKK: 'DKK',
    AED: 'AED',
    SAR: 'SAR',
    QAR: 'QAR',
    BHD: 'BD',
    KWD: 'KWD',
    OMR: 'OMR',
    JOD: 'JOD',
    UAH: '₴',
  };

  return currencySymbols[currencyCode] || currencyCode;
}

module.exports = $currency;
