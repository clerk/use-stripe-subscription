import useSWR, { SWRConfig } from "swr";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";

const StripeContext = createContext(null);

export const SubscriptionProvider = ({
  children,
  endpoint,
  stripePublishableKey,
}: {
  stripePublishableKey: string;
  children: ReactNode;
  endpoint?: string;
}) => {
  const stripeClient = useMemo(() => loadStripe(stripePublishableKey), [
    stripePublishableKey,
    loadStripe,
  ]);
  endpoint = endpoint || "/api/subscription";
  return (
    <StripeContext.Provider
      value={{ clientPromise: stripeClient, endpoint: endpoint }}
    >
      <SWRConfig
        value={{
          fetcher: async (args) => {
            const data = await fetch(args);
            return await data.json();
          },
        }}
      >
        {children}
      </SWRConfig>
    </StripeContext.Provider>
  );
};

export interface redirectToCheckoutArgs {
  price: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface redirectToCustomerPortalArgs {
  redirectUrl?: string;
}

export function useSubscription() {
  const { clientPromise, endpoint } = useContext(StripeContext);
  const { data, error } = useSWR(`${endpoint}?action=useSubscription`);

  // Also wait for customer to load
  if (!data) {
    return {
      isLoaded: false,
    } as {
      isLoaded: false;
      subscription: undefined;
      products: undefined;
      redirectToCheckout: undefined;
      redirectToCustomerPortal: undefined;
    };
  }

  const { products, subscription } = data;

  const redirectToCheckout = async (args: redirectToCheckoutArgs) => {
    if (!args.successUrl) {
      args.successUrl = window.location.href;
    }
    if (!args.cancelUrl) {
      args.cancelUrl = window.location.href;
    }
    const sessionResponse = await fetch(
      `${endpoint}?action=redirectToCheckout`,
      {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      }
    );
    const session = await sessionResponse.json();
    window.location.href = session.url;
  };

  const redirectToCustomerPortal = async (
    args: redirectToCustomerPortalArgs
  ) => {
    args = args || {};
    if (!args.redirectUrl) {
      args.redirectUrl = window.location.href;
    }
    const sessionResponse = await fetch(
      `${endpoint}?action=redirectToCustomerPortal`,
      {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      }
    );
    const session = await sessionResponse.json();
    window.location.href = session.url;
  };

  return {
    isLoaded: true,
    products,
    subscription,
    redirectToCheckout,
    redirectToCustomerPortal,
  };
}

interface GateProps {
  product?: any;
  unsubscribed?: boolean;
  feature?: string;
  negate?: boolean;
  children?: ReactNode;
}
export const Gate = ({
  product,
  negate,
  feature,
  unsubscribed,
  children,
}: GateProps) => {
  const { isLoaded, products, subscription } = useSubscription();

  if ([!!unsubscribed, !!product, !!feature].filter((x) => x).length !== 1) {
    throw new Error(
      `Please pass exactly one of unsubscribed, product, or feature to Gate`
    );
  }

  if (!isLoaded) {
    return null;
  }

  let condition;
  if (unsubscribed) {
    condition = subscription === null;
  }

  if (product || feature) {
    if (subscription === null) {
      return null;
    }
    condition = false;
    for (let item of subscription.items.data) {
      if (product && item.price.product === product.id) {
        condition = true;
      } else if (feature) {
        const productFeatures =
          products
            .find((x) => x.product.id === item.price.product)
            .product.metadata.features?.split(",") || [];
        for (let productFeature of productFeatures) {
          if (productFeature === feature) {
            condition = true;
          }
        }
      }
    }
  }

  return (!negate && condition) || (negate && !condition) ? (
    <>{children}</>
  ) : null;
};
