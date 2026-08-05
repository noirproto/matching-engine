# matching-engine

Central limit order book (CLOB) matching engine for tokenized equities on Robinhood Chain.

Price-time priority matching against resting limit orders, with automatic routing of unmatched remainder into Uniswap v4 pools. One signed order gets the best of both book and curve.

## How it works

Orders are signed messages — market, side, price, size. The engine holds the book in memory and matches at microsecond latency. When two orders cross, a trade is emitted for on-chain settlement. Any unmatched remainder routes through the Uniswap v4 pool for that pair on Robinhood Chain (chain ID 4663), so every order accesses the deepest available liquidity.

```
buy  AAPL/USD  limit  195.50  100  →  engine
sell AAPL/USD  limit  195.50   60  →  engine (book fill)
                                    ↓
                         trade: 60 @ 195.50  (book)
                         remainder: 40 → Uniswap v4 pool
```

## Uniswap v4 Integration

The matching engine treats Uniswap v4 pools as a persistent liquidity layer:

1. **Book first** — incoming orders match against resting limit orders using price-time priority.
2. **Pool second** — any unfilled remainder routes into the corresponding v4 pool on Robinhood Chain.
3. **Single receipt** — the trader receives one settlement covering both book fills and pool fills.

This hybrid model means resting limit orders set the price when liquidity exists on the book, and the v4 pool absorbs flow when it doesn't. Pool is liquidity. Orderbook is the market on top.

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
- `src/router.ts` — V4 pool router: sends unmatched remainder to Uniswap v4
- `src/api.ts` — Minimal HTTP API, zero framework dependencies

## License

MIT