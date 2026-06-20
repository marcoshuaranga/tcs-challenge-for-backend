## ADDED Requirements

### Requirement: SqsMessagePublisher.publish
The system SHALL provide a `SqsMessagePublisher` class implementing `MessagePublisherPort`.
Its `publish(message: ProcessOrderMessage): Promise<void>` method SHALL send a
`SendMessageCommand` to SQS with:
- `QueueUrl` set to the value provided at construction time.
- `MessageBody` set to `JSON.stringify({ orderId: message.orderId })`.

The class SHALL accept an `SQSClient` and `queueUrl` via its constructor so the SQS
client can be injected in tests.

#### Scenario: publish sends SendMessageCommand with correct QueueUrl and body
- **WHEN** `publisher.publish({ orderId: 'abc-123' })` is called
- **THEN** `SendMessageCommand` is called with `QueueUrl` matching the injected queue URL
  and `MessageBody === '{"orderId":"abc-123"}'`

#### Scenario: publish resolves without error on success
- **WHEN** the SQS client resolves successfully
- **THEN** `publish` resolves without throwing

#### Scenario: publish rejects when SQS client throws
- **WHEN** the SQS client throws (network error, invalid queue URL, etc.)
- **THEN** `publish` rejects with the underlying error
