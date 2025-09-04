// Step 9: Event Sourcing basics

type Order = {
  id: string;
  userId: string;
  total: number;
  status: "PLACED" | "PAID" | "SHIPPED" | "FAILED";
};

type DomainEvent =
  | {
      type: "OrderPlaced";
      payload: { id: string; userId: string; total: number };
    }
  | { type: "PaymentProcessed"; payload: { orderId: string; success: boolean } }
  | { type: "OrderShipped"; payload: { orderId: string } };

// --- Event Store ---
class EventStore {
  private events: DomainEvent[] = [];

  append(event: DomainEvent) {
    console.log(`[EventStore] Appending event: ${event.type}`);
    this.events.push(event);
  }

  getAllEvents(): DomainEvent[] {
    return [...this.events];
  }

  replay(handler: (event: DomainEvent) => void) {
    for (const event of this.events) {
      handler(event);
    }
  }
}

const store = new EventStore();

// --- state Projection (read model) ---
function buildOrderState(events: DomainEvent[]): Map<string, Order> {
  const state = new Map<string, Order>();

  for (const event of events) {
    switch (event.type) {
      case "OrderPlaced": {
        const { id, userId, total } = event.payload;
        state.set(id, { id, userId, total, status: "PLACED" });
        break;
      }
      case "PaymentProcessed": {
        const { orderId, success } = event.payload;
        const order = state.get(orderId);
        if (order) {
          order.status = success ? "PAID" : "FAILED";
        }
        break;
      }
      case "OrderShipped": {
        const { orderId } = event.payload;
        const order = state.get(orderId);
        if (order) {
          order.status = "SHIPPED";
        }
        break;
      }
    }
  }

  return state;
}

// --- application commands (write) ---
function placeOrder(id: string, userId: string, total: number) {
  store.append({ type: "OrderPlaced", payload: { id, userId, total } });
}

function processPayment(orderId: string, success: boolean) {
  store.append({ type: "PaymentProcessed", payload: { orderId, success } });
}

function shipOrder(orderId: string) {
  store.append({ type: "OrderShipped", payload: { orderId } });
}

// write (appends events)
placeOrder("o-1", "u-1", 49.99);
processPayment("o-1", true);
shipOrder("o-1");

placeOrder("o-2", "u-2", 149.99);
processPayment("o-2", false);

// read (rebuilds state)
console.log("\n=== Current State (Replayed from events) ===");
const state = buildOrderState(store.getAllEvents());
for (const order of state.values()) {
  console.log(order);
}

// shows full event log
console.log("\n=== Event Log ===");
console.log(store.getAllEvents());
