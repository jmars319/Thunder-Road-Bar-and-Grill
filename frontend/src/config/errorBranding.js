const BRAND_LIBRARY = {
  trbg: {
    serviceName: 'Thunder Road Bar & Grill',
    context404: 'Need our latest menus, hours, or live music schedule? Head back to the home page to browse everything in one place.',
    context5xx: 'We are tuning up our menu and reservation services right now. Everything will be back shortly.',
  },
  mms: {
    serviceName: 'Midway Mobile Storage',
    context404: 'Looking for storage rates or service availability? Start from the home page to get the right contact info fast.',
    context5xx: 'We are refreshing service availability information. Please try again in a moment.',
  },
  mmh: {
    serviceName: 'Midway Music Hall',
    context404: 'Find tickets, show details, or venue info from our home page.',
    context5xx: 'We are updating event schedules and ticketing. Give us a minute and try again.',
  },
};

const brandKey = (process.env.REACT_APP_BRAND_KEY || 'trbg').toLowerCase();
const selectedBrand = BRAND_LIBRARY[brandKey] || BRAND_LIBRARY.trbg;

export const serviceName =
  process.env.REACT_APP_SERVICE_NAME || selectedBrand.serviceName;

export const contexts = {
  default404: selectedBrand.context404,
  default5xx: selectedBrand.context5xx,
  trbg404: selectedBrand.context404,
  trbg5xx: selectedBrand.context5xx,
};

export const supportEmail =
  process.env.REACT_APP_SUPPORT_EMAIL || 'support@jamarq.digital';
