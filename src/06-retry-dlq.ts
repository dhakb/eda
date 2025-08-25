// Step 6: Retry and Dead Letter Queue simulation

type Order = {
  id: string;
  userId: string;
  total: number;
};

type Event =
  | { type: "OrderPlaced"; payload: Order }
  | { type: "PaymentProcessed"; payload: { order: Order; success: boolean } }
  | { type: "OrderShipped"; payload: Order };

// Dead Letter Queue storage
const deadLetterQueue: Event[] = [];

// --- Event Bus with retry logic ---
class EventBus {
  private subscribers: { [eventType: string]: ((event: Event) => void)[] } = {};
  private maxRetries = 3;

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
      this.deliverWithRetry(handler, event, this.maxRetries);
    }
  }

  private deliverWithRetry(
    handler: (event: Event) => void,
    event: Event,
    retriesLeft: number
  ) {
    setTimeout(() => {
      try {
        handler(event);
      } catch (err) {
        console.log(`[Bus] Handler failed for event ${event.type}. Retries left: ${retriesLeft - 1}`);
        if (retriesLeft > 1) {
          this.deliverWithRetry(handler, event, retriesLeft - 1);
        } else {
          console.log(`[Bus] Event moved to Dead Letter Queue: ${event.type}`);
          deadLetterQueue.push(event);
        }
      }
    }, Math.random() * 500);
  }
}

const bus = new EventBus();

// --- Services ---
bus.subscribe("OrderPlaced", (event) => {
  if (event.type !== "OrderPlaced") return;
  const order = event.payload;

  console.log(`[Billing] Processing payment for order ${order.id}`);
  const success = order.total < 100;

  // Simulate random failure
  if (Math.random() < 0.3) {
    throw new Error(`[Billing] Random failure while processing order ${order.id}`);
  }

  bus.publish({ type: "PaymentProcessed", payload: { order, success } });
});

bus.subscribe("PaymentProcessed", (event) => {
  if (event.type !== "PaymentProcessed") return;
  const { order, success } = event.payload;

  if (!success) {
    console.log(`[Shipping] Payment failed for order ${order.id}, cannot ship`);
    return;
  }

  console.log(`[Shipping] Preparing shipment for order ${order.id}`);

  if (Math.random() < 0.2) {
    throw new Error(`[Shipping] Random failure shipping order ${order.id}`);
  }

  bus.publish({ type: "OrderShipped", payload: order });
});

bus.subscribe("OrderShipped", (event) => {
  if (event.type !== "OrderShipped") return;
  const order = event.payload;

  console.log(`[Notification] Order ${order.id} shipped! Sending notification to user ${order.userId}`);

  if (Math.random() < 0.1) {
    throw new Error(
      `[Notification] Random failure notifying order ${order.id}`
    );
  }
});

// --- Producer ---
function placeOrder(order: Order) {
  console.log(`[Order] Placing order ${order.id}`);
  bus.publish({ type: "OrderPlaced", payload: order });
}

const orders: Order[] = [
  { id: "o-1", userId: "u-1", total: 49.99 },
  { id: "o-2", userId: "u-2", total: 149.99 },
];

for (const order of orders) {
  placeOrder(order);
}

setTimeout(() => {
  console.log("\n=== DEAD LETTER QUEUE ===");
  console.log(deadLetterQueue);
}, 3000);
