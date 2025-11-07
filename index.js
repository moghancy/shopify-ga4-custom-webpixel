/**
 * Shopify Store - Custom Web Pixel
 * Uses existing Google Tag Container GT-******
 * @author Amir Moghaddam
 */

const CONFIG = {
  // Container
  GOOGLE_TAG_ID: 'GT-******',

  // Reference IDs
  IDS: {
    ga4: 'G-******',
    googleAds: 'AW-******',
    merchantCenter: 'MC-******'
  },

  CURRENCY: 'EUR',
  DEBUG_MODE: false,
  FALLBACK_BRAND: 'Brand Name'
};

/**
 * Google Tag Initialization
 * Checks if gtag is already loaded by Google & YouTube App
 */
(function initializeGoogleTag() {
  if (typeof window.gtag !== 'undefined') {
    console.log('[Web Pixel] gtag already loaded by Google & YouTube App');
    return;
  }

  // Load gtag if not present
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GOOGLE_TAG_ID}`;
  document.head.appendChild(script);

  gtag('js', new Date());
  gtag('config', CONFIG.GOOGLE_TAG_ID);

  if (CONFIG.DEBUG_MODE) {
    console.log('[Web Pixel] Google Tag loaded:', CONFIG.GOOGLE_TAG_ID);
  }
})();

/**
 * Removes variant suffix from product name
 * Example: "T-Shirt Sparkle - XS" "T-Shirt Sparkle"
 */
function cleanProductName(productTitle, variantTitle) {
  if (!variantTitle || !productTitle) return productTitle;
  const suffix = ' - ' + variantTitle;
  if (productTitle.endsWith(suffix)) {
    return productTitle.slice(0, -suffix.length);
  }
  return productTitle;
}

/**
 * Creates item ID - uses SKU if available, otherwise Shopify IDs
 */
function createItemId(product, variant) {
  // Use SKU format if available
  if (variant.sku && variant.sku.trim() !== '') {
    return `SKU_${variant.sku}`;
  }

  // Fallback to Shopify ID format
  return `shopify_DE_${product.id}_${variant.id}`;
}

/**
 * Formats a product with dynamic Shopify categories
 * item_category is always included, additional categories are conditional
 */
function formatItem(variant, quantity = 1, lineItem = null) {
  const product = variant.product || variant;

  // Base item with item_category always included
  const item = {
    item_id: createItemId(product, variant),
    item_name: cleanProductName(product.title, variant.title),
    item_variant: variant.title,
    item_brand: product.vendor || CONFIG.FALLBACK_BRAND,
    item_category: product.type || '',
    price: parseFloat(variant.price.amount),
    quantity: quantity
  };

  // Add additional categories conditionally (only if they exist)
  if (product.collections?.[0]?.title) {
    item.item_category2 = product.collections[0].title;
  }

  if (product.collections?.[1]?.title) {
    item.item_category3 = product.collections[1].title;
  }

  if (product.collections?.[2]?.title) {
    item.item_category4 = product.collections[2].title;
  }

  if (product.collections?.[3]?.title) {
    item.item_category5 = product.collections[3].title;
  }

  if (lineItem?.discountAllocations?.[0]) {
    const discountAllocation = lineItem.discountAllocations[0];

    // Add discount amount
    if (discountAllocation.amount?.amount) {
      item.discount = parseFloat(discountAllocation.amount.amount);
    }

    // Add coupon name
    if (discountAllocation.discountApplication?.title) {
      item.coupon = discountAllocation.discountApplication.title;
    }
  }

  return item;
}

/**
 * Formats multiple products (cart/checkout)
 * Passes full lineItem to formatItem for discount info
 */
function formatItems(lineItems) {
  if (!lineItems || !Array.isArray(lineItems)) return [];
  return lineItems.map(lineItem => {
    const variant = lineItem.merchandise || lineItem.variant;
    return formatItem(variant, lineItem.quantity, lineItem);
  });
}

/**
 * Sends event via gtag
 * - gtag: For Google Tag Container (GT-*******)
 */
function sendEvent(eventName, params) {
  try {
    // Send via gtag (Google Tag Container standard method)
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }

    if (CONFIG.DEBUG_MODE) {
      console.log(`[Web Pixel] ${eventName}`, params);
    }
  } catch (error) {
    console.error(`[Web Pixel] ${eventName}`, error);
  }
}

// E-Commerce Event Subscriptions

analytics.subscribe('page_viewed', (event) => {
  sendEvent('page_view', {
    page_title: event.context.document.title,
    page_location: event.context.document.location.href
  });
});

analytics.subscribe('product_viewed', (event) => {
  const item = formatItem(event.data.productVariant);
  sendEvent('view_item', {
    currency: CONFIG.CURRENCY,
    value: item.price,
    items: [item]
  });
});

analytics.subscribe('product_added_to_cart', (event) => {
  const cartLine = event.data.cartLine;
  const item = formatItem(cartLine.merchandise, cartLine.quantity);
  sendEvent('add_to_cart', {
    currency: CONFIG.CURRENCY,
    value: parseFloat(cartLine.cost.totalAmount.amount),
    items: [item]
  });
});

analytics.subscribe('product_removed_from_cart', (event) => {
  const cartLine = event.data.cartLine;
  const item = formatItem(cartLine.merchandise, cartLine.quantity);
  sendEvent('remove_from_cart', {
    currency: CONFIG.CURRENCY,
    value: parseFloat(cartLine.cost.totalAmount.amount),
    items: [item]
  });
});

analytics.subscribe('cart_viewed', (event) => {
  const cart = event.data.cart;
  if (!cart || !cart.lines) return;
  const items = formatItems(cart.lines);
  const value = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  sendEvent('view_cart', {
    currency: CONFIG.CURRENCY,
    value: value,
    items: items
  });
});

analytics.subscribe('checkout_started', (event) => {
  const checkout = event.data.checkout;
  const items = formatItems(checkout.lineItems);

  const eventData = {
    currency: checkout.currencyCode || CONFIG.CURRENCY,
    value: parseFloat(checkout.totalPrice.amount),
    items: items
  }

  const coupon = checkout.discountApplications?.[0]?.title;
  if (coupon) {
    eventData.coupon = coupon;
  }

  sendEvent('begin_checkout', eventData);
});

analytics.subscribe('checkout_shipping_info_submitted', (event) => {
  const checkout = event.data.checkout;
  const items = formatItems(checkout.lineItems);

  const eventData = {
    currency: checkout.currencyCode || CONFIG.CURRENCY,
    value: parseFloat(checkout.totalPrice.amount),
    shipping_tier: checkout.delivery?.selectedDeliveryOptions?.[0]?.title ||  checkout.shippingLine?.title || '',
    items: items
  }

  const coupon = checkout.discountApplications?.[0]?.title;
  if (coupon) {
    eventData.coupon = coupon;
  }

  sendEvent('add_shipping_info', eventData);
});

analytics.subscribe('payment_info_submitted', (event) => {
  const checkout = event.data.checkout;
  const items = formatItems(checkout.lineItems);

  const eventData = {
    currency: checkout.currencyCode || CONFIG.CURRENCY,
    value: parseFloat(checkout.totalPrice.amount),
    items: items
  };

  // Only add payment_type if available
  const paymentType = checkout.transactions?.[0]?.gateway;
  if (paymentType) {
    eventData.payment_type = paymentType;
  }

  const coupon = checkout.discountApplications?.[0]?.title;
  if (coupon) {
    eventData.coupon = coupon;
  }

  sendEvent('add_payment_info', eventData);
});

analytics.subscribe('checkout_completed', (event) => {
  const checkout = event.data.checkout;
  const order = checkout.order;
  const items = formatItems(checkout.lineItems);

  const eventData = {
    transaction_id: order.id.toString(),
    currency: checkout.currencyCode || CONFIG.CURRENCY,
    value: parseFloat(checkout.totalPrice.amount),
    tax: parseFloat(checkout.totalTax?.amount || 0),
    shipping: parseFloat(checkout.shippingLine?.price.amount || 0),
    items: items
  }

  const coupon = checkout.discountApplications?.[0]?.title;
  if (coupon) {
    eventData.coupon = coupon;
  }

  sendEvent('purchase', eventData);
});

analytics.subscribe('search_submitted', (event) => {
  sendEvent('search', {
    search_term: event.data.searchResult.query
  });
});

// Debug Info
if (CONFIG.DEBUG_MODE) {
  console.log('%c[Custom Web Pixel] Active', 'color: #00ff00; font-weight: bold');
  console.log('Container:', CONFIG.GOOGLE_TAG_ID);
  console.log('GA4:', CONFIG.IDS.ga4);
  console.log('Google Ads:', CONFIG.IDS.googleAds);
  console.log('Method: gtag()');
  console.log('Item ID: SKU-based (with fallback)');
  console.log('Features: Clean product names, dynamic categories');
}
