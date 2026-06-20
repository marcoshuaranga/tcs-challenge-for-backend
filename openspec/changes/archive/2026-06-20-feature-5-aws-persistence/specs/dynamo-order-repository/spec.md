## ADDED Requirements

### Requirement: DynamoOrderRepository.findById
The system SHALL provide a `DynamoOrderRepository` class implementing `OrderRepositoryPort`.
Its `findById(id: string): Promise<Order | undefined>` method SHALL return the `Order`
when an item with that id exists in DynamoDB, and `undefined` when it does not.

#### Scenario: Returns the order for an existing id
- **WHEN** an order has been saved and `findById(order.id)` is called
- **THEN** it returns the `Order` object with all fields matching the saved values

#### Scenario: Returns undefined for an unknown id
- **WHEN** `findById('nonexistent-id')` is called and no item exists with that id
- **THEN** it returns `undefined`

---

### Requirement: DynamoOrderRepository.save
The `save(order: Order): Promise<void>` method SHALL upsert the order in DynamoDB.
A subsequent `findById` call SHALL return the updated values.

#### Scenario: Save then findById returns updated order
- **WHEN** an order is saved with `save(order)` and then `findById(order.id)` is called
- **THEN** the returned order reflects all fields of the saved order

#### Scenario: Save is idempotent — overwriting with same id updates in place
- **WHEN** `save(order)` is called twice with orders sharing the same id but different fields
- **THEN** `findById(order.id)` returns the values from the second save

---

### Requirement: DynamoOrderRepository.listAll
The `listAll(): Promise<Order[]>` method SHALL return all saved orders via GSI1.
It SHALL return an empty array when no orders exist.

#### Scenario: Returns all saved orders
- **WHEN** multiple orders have been saved and `listAll()` is called
- **THEN** it returns an array containing all saved orders

#### Scenario: Returns empty array when no orders exist
- **WHEN** the table is empty and `listAll()` is called
- **THEN** it returns an empty array `[]`
