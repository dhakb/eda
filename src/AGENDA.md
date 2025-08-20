**What are going to do**
### Event-Driven Architecture (EDA) Basics — Learning Path

This repo is a step-by-step journey from a direct, synchronous implementation to a production-style, event-driven system. 
Each step is isolated in its own file, introduces one or two core ideas, and keeps the domain constant so outputs can be compared easily.

**Domain user throughout**: a tiny e-commerce flow:

`OrderPlaced` &rarr; `PaymentProcessed` &rarr; `InventoryReserved` &rarr; `ShipmentPrepared`