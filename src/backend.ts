import Stripe from "stripe";

export const stripeApiClient =
  typeof window === "undefined"
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: null,
      })
    : null;

export const subscriptionHandler = async ({ customerId, query, body }) => {
  if (query.action === "useSubscription") {
    return await useSubscription({ customerId });
  }

  if (query.action === "redirectToCheckout") {
    return await redirectToCheckout({ customerId, body });
  }

  if (query.action === "redirectToBillingPortal") {
    return await redirectToBillingPortal({ customerId, body });
  }

  return { error: "Action not found" };
};

async function useSubscription({ customerId }) {
  // Retrieve products based on default billing portal config

  // First, retrieve the configuration
  const configurations = await stripeApiClient.billingPortal.configurations.list(
    {
      is_default: true,
      expand: ["data.features.subscription_update.products"],
    }
  );

  // Stripe doesn't let us expand as much as we'd like.
  // Run this big mess to manually expand

  // We preserve the order stripe returns things in
  const products = new Array(
    configurations.data[0].features.subscription_update.products.length
  );
  const pricePromises = configurations.data[0].features.subscription_update.products
    .map((product, i) =>
      product.prices.map(async (price, j) => {
        const priceData = await stripeApiClient.prices.retrieve(price, {
          expand: ["product"],
        });
        const cleanPriceData = {
          ...priceData,
          product: (priceData.product as Stripe.Product).id,
        };
        if (!products[i]) {
          products[i] = {
            product: priceData.product,
            prices: new Array(product.prices.length),
          };
          products[i].prices[j] = cleanPriceData;
        } else {
          products[i].prices[j] = cleanPriceData;
        }
      })
    )
    .flat();

  let subscription;
  const subscriptionPromise = stripeApiClient.customers
    .retrieve(customerId, { expand: ["subscriptions"] })
    .then((customer) => {
      // This package is limited to one subscription at a time
      // @ts-ignore
      subscription = customer.subscriptions.data[0] || null;
    });

  await Promise.all([...pricePromises, subscriptionPromise]);

  return { products, subscription };
}

async function redirectToBillingPortal({ customerId, body }) {
  return await stripeApiClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: "http://localhost:3000",
  });
}

async function redirectToCheckout({ customerId, body }) {
  const configurations = await stripeApiClient.billingPortal.configurations.list(
    {
      is_default: true,
      expand: ["data.features.subscription_update.products"],
    }
  );

  // Make sure the price ID is in here somewhere
  let go = false;
  for (let product of configurations.data[0].features.subscription_update
    .products) {
    for (let price of product.prices) {
      if (price === body.price) {
        go = true;
        break;
      }
    }
  }

  if (go) {
    return await stripeApiClient.checkout.sessions.create({
      customer: customerId,
      success_url: "http://localhost:3000",
      cancel_url: "http://localhost:3000",
      line_items: [{ price: body.price, quantity: 1 }],
      mode: "subscription",
    });
  }
  return { error: "Error" };
}
