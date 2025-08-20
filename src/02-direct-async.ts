// Step 2: Direct but asynchronous orchestration (Promises / setTimout, no EDA)

type Order = {
  id: string;
  userId: string;
  total: number;
};

// Billing Service
function processPayment(order: Order): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const success = order.total < 100;

      console.log(`[Billing] Payment ${success ? "approved" : "declined"} for order ${order.id}`);

      resolve(success)
    }, 500)
  })
}

// Shipping service
function shipOrder(order: Order): Promise<void> {
  return new Promise((resolve) => {
    console.log(`[Shipping] Preparing shipment for order ${order.id}`);
    setTimeout(() => {
      console.log(`[Shipping] Shipment ready for order ${order.id}`);
      resolve();
    }, 500);
  });
}

// Orchestrator - coordinates the flow
async function placeOrder(order: Order) {
  console.log(`[Order] Placing order ${order.id} for user ${order.userId}`);

  const paymentSuccess = await processPayment(order);

  if (paymentSuccess) {
    await shipOrder(order);
    console.log(`[Order] Order ${order.id} completed successfully`);
  } else {
    console.log(`[Order] Payment failed for order ${order.id}, cannot ship`);
  }
}

async function main() {
  const orders: Order[] = [
    { id: "o-1", userId: "u-1", total: 49.99 },
    { id: "o-2", userId: "u-2", total: 199.99 },
  ];

  for (const order of orders) {
    await placeOrder(order);
  }
}

main().catch();
