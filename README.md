# use-stripe-subscription

`use-stripe-subscription` makes it easy to add Stripe Billing to a React application. It extends Stripe's SDK with a standardized React SDK for familiar-feeling hooks and components.

Learn more about this package from our blog: [Refactoring Stripe's API for Frontend Access](https://clerk.dev/blog/refactoring-stripes-api-for-frontend-access)

## NPM

```
npm install use-stripe-subscription
```

[Package link](https://www.npmjs.com/package/use-stripe-subscription)

## Demo

A demo of `use-stripe-subscription` in a Next.js project is [available here](https://github.com/clerkinc/use-stripe-subscription-demo).

## Reference

### useSubscription()

`useSubscription()` is a hook that returns:

- `products` - A list of available products and it's available pricing plans in tuple form `{product, prices}`
- `subscription` - The active subscription
- `redirectToCheckout()` - A method to initialize and redirect the current customer to a Checkout session. It is used for purchasing a **new subscription**. Arguments:

  - `price` - The ID of one of the Price objects associated with the Product. Use the `products` list to find a Price ID.
  - `successUrl` - URL where the customer is forwarded if successful. Returns back by default.
  - `cancelUrl` - URL where the customer is forwarded if unsuccessful. Returns back by default.

- `redirectToCustomerPortal()` - A method to initialize and redirect the current customer to a Customer Portal session. It is used for managing an **existing subscription**. Arguments:
  - `returnUrl` - URL where the customer is sent when they choose to leave the Customer Portal. Returns back by default.

[Demo implementation](https://github.com/clerkinc/use-stripe-subscription-demo/blob/main/pages/index.tsx)

### <Gate>

`<Gate>` is a component used to gate content based on the active subscription. It can gate based on the active product ID, or based the features that the active product makes available. The available props are:

- `children` - the React children to render if the condition passes
- `unsubscribed` - render `children` if the customer does not have any subscription
- `product` - render `children` if the customer is subscribed to the passed product
- `feature` - render `children` if the string passed is contained in the **features** key of the Stripe Product's metadata. The **features** key should contain a comma-separated list of features that come with the product.
- `negate` - add this prop to render `children` in the opposite scenario from normal

[Demo implementation](https://github.com/clerkinc/use-stripe-subscription-demo/blob/main/pages/index.tsx)

### <SubscriptionProvider>

A wrapper component that must be mounted at the top of your React tree to provide context to `useSubscription()` and `<Gate>`. Props:

- `stripePublishableKey` - Pass the Stripe Publishable Key here. Required if `redirectToCheckout()` or `redirectToCustomerPortal()` are used.
- `endpoint` - The endpoint where `subscriptionHandler()` is running (see below). Defaults to **/api/subscription**

[Demo implementation](https://github.com/clerkinc/use-stripe-subscription-demo/blob/main/pages/_app.js)

### customerHasFeature()

This function is used on the server to determine if the product the customer is subscribed to contains a given feature. The feature must be listed in the Stripe Product's metadata under the **features** key as a comma-separated list. Arguments:

- `customerId` - the Stripe Customer ID associated with the request
- `feature` - the feature to check

[Demo implementation](https://github.com/clerkinc/use-stripe-subscription-demo/blob/main/pages/api/tryFeature1.ts)

### subscriptionHandler()

This function is "mounted" on your server to communicate with the `useSubscription()` hook. We suggest mounting it on **/api/subscription**, but the location can be configured via `<SubscriptionProvider>`.

The return value of `subscriptionHandler` should be passed directly into the HTTP Response body. Arguments:

- `customerId` - The developer is responsible for determining the Stripe Customer ID associated with an inbound request.
- `body` - The HTTP Request's body, already parsed into a dictionary of key-values
- `query` - The HTTP Request's query string, already parsed into a dictionary of key-values

[Demo implementation](https://github.com/clerkinc/use-stripe-subscription-demo/blob/main/pages/api/subscription.ts)

## Environment variable configuration

`customerHasFeature()` and `subscriptionHandler()` expect for an environment to be set with the Stripe Secret Key. It must be accessible through `process.env.STRIPE_SECRET_KEY`.

# Sponsor

This project is built and sponsored by [Clerk](https://clerk.dev), a Customer Identity Platform that takes a React-first approach to authentication and customer management.

Although the package is built by Clerk, there is no requirement to use Clerk. `subscriptionHandler()` simply accepts any Stripe Customer ID. It is not opinionated about how the ID is determined.
