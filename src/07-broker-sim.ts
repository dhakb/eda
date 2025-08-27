// Step 7: Simulated Message Broker with durable queue

type Order = {
  id: string;
  userId: string;
  total: number;
};

type Event =
  | { type: "OrderPlaced"; payload: Order }
  | { type: "PaymentProcessed"; payload: { order: Order; success: boolean } }
  | { type: "OrderShipped"; payload: Order };

// --- Simulated Broker ---
class Broker {
  private queues: { [eventType: string]: Event[] } = {};
  private consumers: { [eventType: string]: ((event: Event) => void)[] } = {};

  publish(event: Event) {
    console.log(`[Broker] Queuing event: ${event.type}`);
    if (!this.queues[event.type]) {
      this.queues[event.type] = [];
    }
    this.queues[event.type].push(event);

    // Try deliver immediately if consumers exist
    this.deliver(event.type);
  }

  subscribe(eventType: Event["type"], consumer: (event: Event) => void) {
    if (!this.consumers[eventType]) {
      this.consumers[eventType] = [];
    }
    this.consumers[eventType].push(consumer);

    // Deliver backlog (catch-up)
    this.deliver(eventType);
  }

  private deliver(eventType: Event["type"]) {
    const queue = this.queues[eventType] || [];
    const consumers = this.consumers[eventType] || [];
    if (queue.length === 0 || consumers.length === 0) return;

    // FIFO delivery
    while (queue.length > 0) {
      const event = queue.shift()!;
      for (const consumer of consumers) {
        setTimeout(() => consumer(event), Math.random() * 300);
      }
    }
  }
}

const broker = new Broker();

// --- Services ---
function billingService() {
  broker.subscribe("OrderPlaced", (event) => {
    if (event.type !== "OrderPlaced") return;
    const order = event.payload;
    console.log(`[Billing] Processing payment for order ${order.id}`);

    const success = order.total < 100;
    broker.publish({ type: "PaymentProcessed", payload: { order, success } });
  });
}

function shippingService() {
  broker.subscribe("PaymentProcessed", (event) => {
    if (event.type !== "PaymentProcessed") return;
    const { order, success } = event.payload;
    if (!success) {
      console.log(`[Shipping] Payment failed for ${order.id}, skipping`);
      return;
    }

    console.log(`[Shipping] Shipping order ${order.id}`);
    broker.publish({ type: "OrderShipped", payload: order });
  });
}

function notificationService() {
  broker.subscribe("OrderShipped", (event) => {
    if (event.type !== "OrderShipped") return;
    const order = event.payload;
    console.log(`[Notification] Order ${order.id} shipped! User ${order.userId} notified.`);
  });
}


// Only billing is online at first
billingService();

broker.publish({
  type: "OrderPlaced",
  payload: { id: "o-1", userId: "u-1", total: 49.99 },
});
broker.publish({
  type: "OrderPlaced",
  payload: { id: "o-2", userId: "u-2", total: 199.99 },
});

// Later, other services come online
setTimeout(() => {
  shippingService();
  notificationService();
}, 2000);
