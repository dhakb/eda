// Step 8: Broker with partitions and ordering guarantees

type Order = {
  id: string;
  userId: string;
  total: number;
};

type Event =
  | { type: "OrderPlaced"; payload: Order }
  | { type: "PaymentProcessed"; payload: { order: Order; success: boolean } }
  | { type: "OrderShipped"; payload: Order };

// --- Partitioned Broker ---
class PartitionedBroker {
  private partitions: { [eventType: string]: Event[][] } = {};
  private consumers: { [eventType: string]: ((event: Event) => void)[] } = {};
  private readonly numPartitions: number;

  constructor(numPartitions: number) {
    this.numPartitions = numPartitions;
  }

  // simple hash for partitioning
  private getPartitionKey(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) % this.numPartitions;
    }
    return hash;
  }

  publish(event: Event, key: string) {
    console.log(`[Broker] Queuing event: ${event.type} (key=${key})`);
    if (!this.partitions[event.type]) {
      this.partitions[event.type] = Array.from({ length: this.numPartitions }, () => []);
    }
    const partitionIndex = this.getPartitionKey(key);
    this.partitions[event.type][partitionIndex].push(event);

    this.deliver(event.type, partitionIndex);
  }

  subscribe(eventType: Event["type"], consumer: (event: Event) => void) {
    if (!this.consumers[eventType]) {
      this.consumers[eventType] = [];
    }
    this.consumers[eventType].push(consumer);

    // delivers backlog for all partitions
    for (let i = 0; i < this.numPartitions; i++) {
      this.deliver(eventType, i);
    }
  }

  private deliver(eventType: Event["type"], partitionIndex: number) {
    const queue = this.partitions[eventType]?.[partitionIndex] || [];
    const consumers = this.consumers[eventType] || [];
    if (queue.length === 0 || consumers.length === 0) return;

    // delivers sequentially (FIFO) within this partition
    while (queue.length > 0) {
      const event = queue.shift()!;
      for (const consumer of consumers) {
        // each partition runs independently (simulated parallelism)
        setTimeout(() => consumer(event), Math.random() * 500);
      }
    }
  }
}

const broker = new PartitionedBroker(2); // 2 partitions

// --- Services ---
broker.subscribe("OrderPlaced", (event) => {
  if (event.type !== "OrderPlaced") return;
  const order = event.payload;
  console.log(`[Billing] Processing payment for order ${order.id}`);
  const success = order.total < 100;
  broker.publish({ type: "PaymentProcessed", payload: { order, success } }, order.id);
});

broker.subscribe("PaymentProcessed", (event) => {
  if (event.type !== "PaymentProcessed") return;
  const { order, success } = event.payload;
  if (!success) {
    console.log(`[Shipping] Payment failed for ${order.id}, skipping`);
    return;
  }
  console.log(`[Shipping] Shipping order ${order.id}`);
  broker.publish({ type: "OrderShipped", payload: order }, order.id);
});

broker.subscribe("OrderShipped", (event) => {
  if (event.type !== "OrderShipped") return;
  const order = event.payload;
  console.log(`[Notification] Order ${order.id} shipped! User ${order.userId} notified.`);
});


const orders: Order[] = [
  { id: "o-1", userId: "u-1", total: 49.99 },
  { id: "o-2", userId: "u-2", total: 149.99 },
  { id: "o-3", userId: "u-3", total: 75.5 },
  { id: "o-4", userId: "u-4", total: 20.0 },
];

for (const order of orders) {
  broker.publish({ type: "OrderPlaced", payload: order }, order.id);
}