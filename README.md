# Shopify GA4 Custom Web Pixel

A custom web pixel for Shopify that sends complete e-commerce tracking events directly to Google Analytics 4.

## Features

- Complete GA4 e-commerce event tracking (view_item, add_to_cart, purchase, etc.)
- SKU-based item IDs with Shopify ID fallback
- Dynamic product category mapping from collections
- Clean product names (removes variant suffixes)
- Discount and coupon tracking
- Debug mode for development

## Installation

1. Update the `CONFIG` object in `index.js` with your tracking IDs
2. Upload to Shopify Admin → Settings → Customer events → Custom pixels
3. Test in preview mode with DEBUG_MODE enabled

## Configuration

```javascript
const CONFIG = {
  GOOGLE_TAG_ID: 'GT-XXXXXXX',  // Your Google Tag Container ID
  IDS: {
    ga4: 'G-XXXXXXX',           // Your GA4 Measurement ID
    googleAds: 'AW-XXXXXXX',    // Your Google Ads ID
    merchantCenter: 'MC-XXXXXXX' // Your Merchant Center ID
  },
  CURRENCY: 'EUR',
  DEBUG_MODE: false
};
```

Made to help others facing the same Shopify GA4 tracking challenges.
