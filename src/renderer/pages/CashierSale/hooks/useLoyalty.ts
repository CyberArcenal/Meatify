import { useState, useEffect } from "react";
import customerAPI from "../../../api/core/customer";

export const useLoyalty = (customerId?: number) => {
  const [loyaltyPointsAvailable, setLoyaltyPointsAvailable] = useState(0);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);

  useEffect(() => {
    if (customerId) {
      customerAPI
        .getLoyaltySummary(customerId)
        .then((res) => {
          if (res.status) {
            setLoyaltyPointsAvailable(res.data.customer.loyaltyPointsBalance);
          } else {
            setLoyaltyPointsAvailable(0);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch loyalty points", err);
          setLoyaltyPointsAvailable(0);
        });
    } else {
      setLoyaltyPointsAvailable(0);
      setLoyaltyPointsToRedeem(0);
      setUseLoyalty(false);
    }
  }, [customerId]);

  return {
    loyaltyPointsAvailable,
    loyaltyPointsToRedeem,
    useLoyalty,
    setLoyaltyPointsToRedeem,
    setUseLoyalty,
  };
};