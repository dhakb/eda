// Step 1: Direct synchronous orchestration (no EDA)

type Order = {
  id: string;
  userId: string;
  total: number;
}

// Billing service
function processPayment(order: Order): boolean {
  console.log(`[Billing] Processing payment for order ${order.id}, total $${order.total}`);

  const success = order.total < 100;

  console.log(`[Billing] Payment ${success ? "approved" : "declined "} for order ${order.id}`);

  return success;
}

// Shipping service
function shipOrder(order: Order): void {
  console.log(`[Shipping] Preparing shipment for order ${order.id}`);
}

// Orchestrator - coordinates the flow
function placeOrder(order: Order): void {
  console.log(`[Order] Placing order ${order.id} for user ${order.userId}`);

  const paymentSuccess = processPayment(order);

  if (paymentSuccess) {
    shipOrder(order);
    console.log(`[Order] Order ${order.id} completed successfully`);
  } else {
    console.log(`[Order] Payment failed for order ${order.id}, cannot ship`);
  }
}

const orders: Order[] = [
  {id: "order-1", userId: "user-1", total: 49.99},
  {id: "order-2", userId: "user-2", total: 101.99}
];

for (const order of orders) {
  placeOrder(order);
}

