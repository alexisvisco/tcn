# test card nexus 

## Projects

- client : the client side of the application
- src/* : the server side of the application
- text-scan-api : a simple python OCR API using [doctr](https://github.com/mindee/doctr)
- scripts/augment_cards.ts : simple script to try to retrieve images for the client :) 

## mongodb design considerations 

### schema 

At first i would love to have schema ensured by mongodb and not have to deal with the schema in the code, 
but I found that you can create, delete but not update a collection. So if you add json schema to a collection, you need to transfer all the data to a new collection. 

Mongoose schema is an option but it's in the code and highly coupled to the database. 

So I decide to do the schema in the code and not in the database, with zod.

### Indexing strategy

Since it's a card games i am aware that the cards will certainly not be added by User but by the admin, so i can create indexes on the fields that are used to filter the cards (name, type, rarity, color, ink_cost).
And even if it's by user and them moderation, the number of cards are in a period of time finite.

That's why the indexing strategy on the card collection can be done aggressively.

For the example, I only added index for search on the name and for the type of card.

But in the end we can add indexes on all fields that are used to filter the cards based on the frequency of the filter. More a filter is used, more the index is important to add.

### Migration of mongodb

I have created a simple migration helper to help me with that, since I does not have a lot of confidence in nodejs tools (I tried https://github.com/ilovepixelart/ts-migrate-mongoose but it output weird message and does not inspire trust).

## Server

The server use a Hono server. It's a multiple runtime http server. 

There is three endpoints : 

- GET /api/cards : to get the cards, will returns all the cards in the database paginated
- POST /api/cardscan : to scan a card, will return the most similar card in the database
- GET /healthcheck : to check if the server is up

