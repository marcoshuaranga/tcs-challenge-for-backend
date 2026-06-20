## Purpose

DynamoDB-backed implementation of `AuditRepositoryPort` (`append`, `findByOrderId`).
Same single table as orders: `PK=ORDER#<orderId>`, `SK=AUDIT#<timestamp>#<uuid>`.
The `#<uuid>` suffix prevents SK collision when two entries share the same millisecond.

## Requirements

### Requirement: DynamoAuditRepository.append
The system SHALL provide a `DynamoAuditRepository` class implementing `AuditRepositoryPort`.
Its `append(entry: AuditEntry): Promise<void>` method SHALL persist the audit entry to
DynamoDB under the key `PK=ORDER#<orderId>`, `SK=AUDIT#<timestamp>#<uuid>`.
Multiple entries for the same order SHALL coexist without collision.

#### Scenario: Append then findByOrderId returns the entry
- **WHEN** an audit entry is appended with `append(entry)` and `findByOrderId(entry.orderId)` is called
- **THEN** the returned array contains the appended entry

#### Scenario: Multiple appends for the same order do not collide
- **WHEN** two audit entries with the same `orderId` (and even the same `timestamp`) are appended
- **THEN** `findByOrderId(orderId)` returns both entries

---

### Requirement: DynamoAuditRepository.findByOrderId
The `findByOrderId(orderId: string): Promise<AuditEntry[]>` method SHALL query DynamoDB
for all items with `PK=ORDER#<orderId>` and `SK begins_with AUDIT#`.
It SHALL return entries in ascending timestamp order (SK sort order).
It SHALL return an empty array when no entries exist for the given order.

#### Scenario: Returns entries in timestamp order
- **WHEN** two audit entries for the same order are appended and `findByOrderId(orderId)` is called
- **THEN** the entries are returned in ascending timestamp (SK) order

#### Scenario: Returns empty array when no entries exist
- **WHEN** `findByOrderId('order-with-no-audit')` is called and no entries exist
- **THEN** it returns an empty array `[]`
