import useSWR, { SWRConfig } from "swr";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";

const stripeClient =
  typeof window !== "undefined"
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

const StripeContext = createContext(null);

export const SubscriptionProvider = ({
  children,
  endpoint,
}: {
  children: ReactNode;
  endpoint?: string;
}) => {
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
      redirectToBillingPortal: undefined;
    };
  }

  const { products, subscription } = data;

  const redirectToCheckout = async (args: any) => {
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

  const redirectToBillingPortal = async () => {
    const sessionResponse = await fetch(
      `${endpoint}?action=redirectToBillingPortal`,
      {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
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
    redirectToBillingPortal,
  };
}

interface GateProps {
  product?: any;
  unsubscribed?: boolean;
  negate?: boolean;
  children?: ReactNode;
}
export const Gate = ({
  product,
  negate,
  unsubscribed,
  children,
}: GateProps) => {
  const { isLoaded, products, subscription } = useSubscription();

  if (!isLoaded) {
    return null;
  }

  let condition;
  if (unsubscribed) {
    condition = subscription === null;
  }

  if (product) {
    if (subscription === null) {
      return null;
    }
    condition = false;
    for (let item of subscription.items.data) {
      if (item.price.product === product.id) {
        condition = true;
      }
    }
  }

  if (!unsubscribed && !product) {
    throw new Error("Please pass either unsubscribed or product to gate");
  }

  return (!negate && condition) || (negate && !condition) ? (
    <>{children}</>
  ) : null;
};
