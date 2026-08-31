const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params, queryRunner) => {
  const { customerId, pointsChange, reason, user = "system" } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }
  if (!pointsChange || pointsChange === 0) {
    return { status: false, message: "pointsChange must be non-zero", data: null };
  }
  if (!reason) {
    return { status: false, message: "reason is required", data: null };
  }

  try {
    const result = await loyaltyTransactionService.manualAdjustPoints(
      customerId,
      pointsChange,
      reason,
      user,
      queryRunner
    );
    // Balanse ay maaaring hindi pa updated sa oras na ito, ngunit ang subscriber ay mag-a-update nito.
    // Maaari kang maghintay ng ilang milliseconds o mag-fetch ng updated customer.
    // Para sa instant na sagot, maaari mong i-fetch ang customer pagkatapos.
    const { Customer } = require("../../../../entities/Customer");
    const customerRepo = queryRunner?.manager?.getRepository(Customer) || AppDataSource.getRepository(Customer);
    const updatedCustomer = await customerRepo.findOne({ where: { id: customerId } });

    return {
      status: true,
      message: `${Math.abs(pointsChange)} points adjusted for customer #${customerId}`,
      data: {
        customer: updatedCustomer,
        transaction: result.transaction,
        pointsChanged: result.pointsChanged,
      },
    };
  } catch (error) {
    console.error("Error in adjustPoints:", error);
    return {
      status: false,
      message: error.message || "Failed to adjust points",
      data: null,
    };
  }
};