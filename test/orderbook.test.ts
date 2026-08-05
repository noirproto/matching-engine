import { describe, it, expect, beforeEach } from 'vitest';
import { OrderBook } from '../src/orderbook.js';
import { Order, Side, OrderType, OrderStatus } from '../src/types.js';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: crypto.randomUUID(),
    asset: 'BTC/USD',
    side: 'buy' as Side,
    type: 'limit' as OrderType,
    price: 100,
    size: 10,
    filled: 0,
    status: 'open' as OrderStatus,
    trader: '0xTrader1',
    signature: '0xsig',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('OrderBook', () => {
  let book: OrderBook;

  beforeEach(() => {
    book = new OrderBook('BTC/USD');
  });

  it('price-time priority: earlier order at same price fills first', () => {
    const buy1 = makeOrder({ side: 'buy', price: 105, size: 5, timestamp: 1000 });
    const buy2 = makeOrder({ side: 'buy', price: 105, size: 5, timestamp: 2000 });
    book.add(buy1);
    book.add(buy2);

    const ask = makeOrder({ side: 'sell', price: 100, size: 5 });
    const trades = book.add(ask);

    expect(trades.length).toBe(1);
    expect(trades[0].buyOrderId).toBe(buy1.id);
  });

  it('limit order matching: buy crosses ask, trade at ask price', () => {
    const ask = makeOrder({ side: 'sell', price: 100, size: 5 });
    book.add(ask);

    const bid = makeOrder({ side: 'buy', price: 105, size: 5 });
    const trades = book.add(bid);

    expect(trades.length).toBe(1);
    expect(trades[0].price).toBe(100);
    expect(trades[0].size).toBe(5);
  });

  it('partial fill: large buy partially fills against small ask', () => {
    const ask = makeOrder({ side: 'sell', price: 100, size: 3 });
    book.add(ask);

    const bid = makeOrder({ side: 'buy', price: 105, size: 10 });
    const trades = book.add(bid);

    expect(trades.length).toBe(1);
    expect(trades[0].size).toBe(3);
    expect(bid.filled).toBe(3);
    expect(bid.status).toBe('partial');
  });

  it('market order fills against best available', () => {
    const ask1 = makeOrder({ side: 'sell', price: 100, size: 5, timestamp: 1000 });
    const ask2 = makeOrder({ side: 'sell', price: 101, size: 5, timestamp: 1000 });
    book.add(ask1);
    book.add(ask2);

    const market = makeOrder({ side: 'buy', type: 'market', price: 0, size: 7 });
    const trades = book.add(market);

    expect(trades.length).toBe(2);
    expect(trades[0].price).toBe(100);
    expect(trades[0].size).toBe(5);
    expect(trades[1].price).toBe(101);
    expect(trades[1].size).toBe(2);
  });

  it('cancel removes order from book', () => {
    const bid = makeOrder({ side: 'buy', price: 100, size: 5 });
    book.add(bid);

    const result = book.cancel(bid.id);
    expect(result).toBe(true);

    const snap = book.snapshot();
    expect(snap.bids.length).toBe(0);
  });

  it('no cross: buy below best ask rests in book', () => {
    const ask = makeOrder({ side: 'sell', price: 105, size: 5 });
    book.add(ask);

    const bid = makeOrder({ side: 'buy', price: 100, size: 5 });
    const trades = book.add(bid);

    expect(trades.length).toBe(0);
    const snap = book.snapshot();
    expect(snap.bids.length).toBe(1);
    expect(snap.asks.length).toBe(1);
  });

  it('snapshot aggregates levels correctly', () => {
    book.add(makeOrder({ side: 'buy', price: 100, size: 5, timestamp: 1000 }));
    book.add(makeOrder({ side: 'buy', price: 100, size: 3, timestamp: 2000 }));
    book.add(makeOrder({ side: 'sell', price: 110, size: 4, timestamp: 1000 }));

    const snap = book.snapshot();
    expect(snap.asset).toBe('BTC/USD');
    expect(snap.bids.length).toBe(1);
    expect(snap.bids[0].price).toBe(100);
    expect(snap.bids[0].size).toBe(8);
    expect(snap.bids[0].count).toBe(2);
    expect(snap.asks.length).toBe(1);
    expect(snap.asks[0].size).toBe(4);
  });
});
