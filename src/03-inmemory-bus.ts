// Step 3: Event-driven architecture using an in-memory pub/sub bus

type Order = {
  id: string;
  userId: string;
  total: number;
};


type AppEvent =
  | { type: "OrderPlaced"; payload: Order }
  | { type: "PaymentProcessed"; payload: { order: Order; success: boolean } }
  | { type: "OrderShipped"; payload: Order };


class EventBus {
  private subscribers: { [eventType: string]: ((event: AppEvent) => void)[] } = {};

  subscribe(eventType: AppEvent["type"], handler: (event: AppEvent) => void) {
    if (!this.subscribers[eventType]) {
      this.subscribers[eventType] = [];
    }

    this.subscribers[eventType].push(handler);
  }

  publish(event: AppEvent) {
    console.log(`[Bus] Publishing event: ${event.type}`);

    const handlers = this.subscribers[event.type] || [];
    for (const handler of handlers) {
      handler(event);
    }
  }
}

const bus = new EventBus();

// -- Services --

// Billing service reacts to OrderPlaced
bus.subscribe("OrderPlaced", (event) => {
  if (event.type !== "OrderPlaced") return;

  const order = event.payload;

  console.log(`[Billing] Processing payment for order ${order.id}, total $${order.total}`);

  const success = order.total < 100;

  bus.publish({type: "PaymentProcessed", payload: {order, success}});
});

// Shipping Service reacts to PaymentProcessed
bus.subscribe("PaymentProcessed", (event) => {
  if (event.type !== "PaymentProcessed") return;

  const {order, success} = event.payload;
  if (!success) {
    console.log(`[Shipping] Payment failed for order ${order.id}, cannot ship`);
    return;
  }
  console.log(`[Billing] Payment ${success ? "approved" : "declined"} for order ${order.id}`);
  
  console.log(`[Shipping] Preparing shipment for order ${order.id}`);

  bus.publish({type: "OrderShipped", payload: order});
});

// Notification service reacts to OrderShipped
bus.subscribe("OrderShipped", (event) => {
  if (event.type !== "OrderShipped") return;

  const order = event.payload;

  console.log(`[Notification] Order ${order.id} shipped! Sending notification to user ${order.userId}`);
});


// --- Producer ---
function placeOrder(order: Order) {
  console.log(`[Order] Placing order ${order.id} for user ${order.userId}`);
  bus.publish({ type: "OrderPlaced", payload: order });
}

const orders: Order[] = [
  { id: "o-1", userId: "u-1", total: 49.99 },
  { id: "o-2", userId: "u-2", total: 101.99 },
];

for (const order of orders) {
  placeOrder(order);
}