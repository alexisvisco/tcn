# CN test

## Project Overview

The system provides a flexible architecture for unified card queries across different game systems, advanced filtering capabilities, and a card recognition feature using OCR technology.

## Installation

### Requirements
- Docker Compose (for MongoDB, OCR scanning API, and client)
- Node.js environment
- Bun runtime

### Getting Started
```bash
# Clone repository
# Setup environment
cp .env.dist .env

# Start services
docker-compose up -d  # Starts MongoDB, text scanning API, and client

# Run the server
bun run app.ts
```

## Architecture & Components

### Project Structure
- `client/`: React-based frontend interface (accessible at https://cardnexus-test.rovercap.alexisvis.co/)
- `src/`: Server-side application code
    - `domain/`: Business domain models and type definitions
    - `model/`: Database models and schema mappings
    - `service/`: Business logic services
    - `helper/`: Utility functions
- `text-scan-api/`: Python OCR API using [doctr](https://github.com/mindee/doctr)
- `scripts/augment_cards.ts`: Script to retrieve and enrich card data with images

## MongoDB Deep Dive

Despite not being a MongoDB enthusiast, I've thoroughly explored its capabilities and limitations for this specific domain problem. Here's my approach to working with MongoDB for card game data:

### Schema Management Strategy

I investigated multiple approaches to schema management in MongoDB:

1. **MongoDB Schema Validation**: Initially considered using MongoDB's native JSON Schema validation, but discovered a significant limitation: while you can create and delete collections with schema validation, updating an existing collection's schema requires migrating all data to a new collection. This would be problematic for production environments.

2. **Mongoose Schema**: Evaluated Mongoose as a schema validation option but determined it creates tight coupling between application code and database, making it harder to evolve the schema independently.

3. **Application-Level Validation with Zod**: Ultimately implemented schema validation using Zod within the application layer. This provides:
    - Strong type safety with TypeScript integration
    - Decoupling of schema validation from the database layer
    - Flexible evolution of schemas without database migrations
    - Clear error messages during validation failures

### Indexing Strategy & Performance Optimization

I designed the indexing strategy based on an understanding of the TCG domain's unique characteristics:

1. **Card Data Characteristics**:
    - Card data is relatively static, with infrequent additions (typically when new sets are released)
    - Card attributes rarely change after creation
    - Read operations vastly outnumber writes

2. **Strategic Indexing**:
    - Implemented text indexes on card names for efficient full-text search capabilities
    - Added specific indexes for `type` fields to optimize filtering by game type

3. **Query Performance**:
    - Optimized MongoDB queries to use available indexes efficiently
    - Implemented aggregation pipelines for complex operations like card similarity scoring
    - Used projection to limit returned fields when appropriate

For this example implementation, I've added indexes for name search and card type filtering, but in a production environment, I would add additional indexes based on actual query patterns and usage analytics.

### MongoDB Migration Framework

Faced with a lack of reliable MongoDB migration tools in the Node.js ecosystem, I developed a lightweight migration helper. After evaluating existing tools like `ts-migrate-mongoose` and finding them unreliable, I created a custom solution that:

1. Tracks migration versions in a dedicated collection
2. Supports idempotent migrations
3. Provides clear logging and error handling
4. Allows both data and schema migrations

## API Design

The server uses Hono, a lightweight and runtime-agnostic HTTP server framework supporting multiple JavaScript runtimes.

### Endpoints

#### 1. GET /api/cards
Retrieves cards with flexible filtering capabilities:

- `query`: Text search across card names (uses MongoDB text index)
- `page` & `itemsPerPage`: Pagination controls
- `attrInkCostRangeFrom` & `attrInkCostRangeTo`: Filter by ink cost (Lorcana)
- `attrColor[]`: Filter by color (Magic: The Gathering)
- `attrRarity[]`: Filter by rarity (works across both games)
- `type`: Filter by game type

Response example for `GET {{url}}/api/cards?attrInkCostRangeFrom=2&attrInkCostRangeTo=3`
```json
{
  "items": [
    {
      "_id": "67e0205f92310794502926e1",
      "name": "Ariel - Spectacular Singer",
      "id": "ariel-spectacular-singer",
      "imageUrl": "https://lorcana-api.com/images/ariel/spectacular_singer/ariel-spectacular_singer-large.png",
      "type": "lorcana",
      "attributes": {
        "inkCost": 3,
        "rarity": "Super Rare"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "itemsPerPage": 10,
    "totalItems": 559,
    "totalPages": 56
  }
}
```

#### 2. POST /api/cardscan
Provides card recognition from uploaded images:

1. Uses the doctr OCR engine to extract text from card images
2. Implements a naive text matching algorithm:
    - Extracts potential card name candidates from the first few lines of OCR results
    - Filters candidates based on confidence scores and text length
    - Performs MongoDB text search with scoring for each candidate
    - Aggregates and deduplicates results with a boosted score for exact matches
    - Returns the top 5 most likely matches

#### 3. GET /healthcheck
Simple endpoint to verify server health.

### Note on observability

I added a little bit of observalibility via logging which IMO is the first step to observability.
I am a fan of canonical logging and I have used it in this project. (https://stripe.com/blog/canonical-log-lines)

TLDR: Canonical logging is a structured logging format that makes it easy to search. In the web server logs, each line is a request, and each field is a piece of information about that request that you can augment with additional context.


## OCR Implementation Details

The card scanning feature demonstrates a practical application of OCR technology:

1. **OCR Processing**:
    - Implemented using [doctr](https://github.com/mindee/doctr), OCR-related tasks library powered by Deep Learning.
    - Processes card images to extract text blocks with confidence scores
    - Returns structured data with text position information

While this is a simple implementation, it demonstrates the potential for more advanced card recognition features in the future.
For example if card id from card game is present on the card, it can be used to identify the card easily.

## Client Application

The client is a React application that provides an intuitive interface for searching and filtering cards. It's deployed at https://cardnexus-test.rovercap.alexisvis.co/.
