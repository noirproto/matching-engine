# matching-engine

Central limit order book (CLOB) for tokenized equities.

Price-time priority. Off-chain matching at hardware speed. On-chain settlement.

## How it works

Orders are signed messages — market, side, price, size. The engine holds the book in memory and matches at microsecond latency. The instant two orders cross, a trade is emitted for on-chain settlement. Nothing moves on-chain until two orders agree.

```
buy  AAPL/USD  limit  195.50  100  →  engine
sell AAPL/USD  limit  195.50   60  →  engine
                                    ↓
                         trade: 60 @ 195.50
```

## API

```bash
# Place a limit buy
curl -X POST http://localhost:3000/order \
  -H "Content-Type: application/json" \
  -d '{"asset":"AAPL/USD","side":"buy","type":"limit","price":195.50,"size":100,"trader":"0xabc","signature":"0x..."}'

# Orderbook snapshot
curl http://localhost:3000/book/AAPL/USD

# Cancel an order
curl -X DELETE http://localhost:3000/order/<id>

# Trade history
curl http://localhost:3000/trades/AAPL/USD
```

## Run

```bash
npm install
npm run build
npm start
```

## Architecture

- `src/types.ts` — Order, Trade, OrderBookLevel interfaces
- `src/orderbook.ts` — Per-asset book with price-time priority sort
- `src/engine.ts` — MatchingEngine: routes orders across books, emits events
- `src/api.ts` — Minimal HTTP API, zero framework dependencies

## License

MIT
