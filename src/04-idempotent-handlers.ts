// Step 4: Idempotent handlers (handling duplicate events)

type Order = {
  id: string;
  userId: string;
  total: number;
};

type Event =
  | { type: "OrderPlaced"; payload: Order }
  | { type: "PaymentProcessed"; payload: { order: Order; success: boolean } }
  | { type: "OrderShipped"; payload: Order };

class EventBus {
  private subscribers: { [eventType: string]: ((event: Event) => void)[] } = {};

  subscribe(eventType: Event["type"], handler: (event: Event) => void) {
    if (!this.subscribers[eventType]) {
      this.subscribers[eventType] = [];
    }
    this.subscribers[eventType].push(handler);
  }

  publish(event: Event) {
    console.log(`[Bus] Publishing event: ${event.type}`);
    const handlers = this.subscribers[event.type] || [];
    for (const handler of handlers) {
      handler(event);
    }
  }
}

const bus = new EventBus();

// --- Services with idempotency ---

// Billing service reacts to OrderPlaced
const processedPayments = new Set<string>();

bus.subscribe("OrderPlaced", (event) => {
  if (event.type !== "OrderPlaced") return;
  const order = event.payload;

  if (processedPayments.has(order.id)) {
    console.log(`[Billing] Skipping duplicate payment for order ${order.id}`);
    return;
  }

  console.log(`[Billing] Processing payment for order ${order.id}`);

  const success = order.total < 100;

  processedPayments.add(order.id);

  bus.publish({ type: "PaymentProcessed", payload: { order, success } });
});

// Shipping service reacts to PaymentProcessed
const shippedOrders = new Set<string>();

bus.subscribe("PaymentProcessed", (event) => {
  if (event.type !== "PaymentProcessed") return;
  const { order, success } = event.payload;

  if (!success) {
    console.log(`[Shipping] Payment failed for order ${order.id}, cannot ship`);
    return;
  }

  if (shippedOrders.has(order.id)) {
    console.log(`[Shipping] Skipping duplicate shipment for order ${order.id}`);
    return;
  }

  console.log(`[Shipping] Preparing shipment for order ${order.id}`);
  shippedOrders.add(order.id);
  bus.publish({ type: "OrderShipped", payload: order });
});

// Notification service reacts to OrderShipped
const notifiedOrders = new Set<string>();

bus.subscribe("OrderShipped", (event) => {
  if (event.type !== "OrderShipped") return;
  const order = event.payload;

  if (notifiedOrders.has(order.id)) {
    console.log(`[Notification] Already notified for order ${order.id}, skipping.`);
    return;
  }

  console.log(`[Notification] Order ${order.id} shipped! Sending notification to user ${order.userId}`);
  notifiedOrders.add(order.id);
});

// --- Producer ---
function placeOrder(order: Order) {
  console.log(`[Order] Placing order ${order.id} for user ${order.userId}`);
  bus.publish({ type: "OrderPlaced", payload: order });
}

const order: Order = { id: "o-1", userId: "u-1", total: 49.99 };

placeOrder(order);
placeOrder(order); // duplicate
