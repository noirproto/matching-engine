import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchingEngine } from '../src/engine.js';

describe('MatchingEngine', () => {
  let engine: MatchingEngine;

  beforeEach(() => {
    engine = new MatchingEngine();
  });

  it('places and matches two crossing orders, producing a trade', () => {
    engine.placeOrder({ asset: 'BTC/USD', side: 'sell', type: 'limit', price: 100, size: 5, trader: '0xSeller', signature: '0xsig1' });
    const { order, trades } = engine.placeOrder({ asset: 'BTC/USD', side: 'buy', type: 'limit', price: 105, size: 5, trader: '0xBuyer', signature: '0xsig2' });

    expect(trades.length).toBe(1);
    expect(trades[0].price).toBe(100);
    expect(trades[0].size).toBe(5);
    expect(order.status).toBe('filled');
  });

  it('cancel order returns true and sets status to cancelled', () => {
    const { order } = engine.placeOrder({ asset: 'BTC/USD', side: 'buy', type: 'limit', price: 90, size: 5, trader: '0xTrader', signature: '0xsig' });

    const result = engine.cancelOrder(order.id);
    expect(result).toBe(true);

    const retrieved = engine.getOrder(order.id);
    expect(retrieved?.status).toBe('cancelled');
  });

  it('get snapshot of empty book', () => {
    const snap = engine.getSnapshot('ETH/USD');
    expect(snap.asset).toBe('ETH/USD');
    expect(snap.bids).toEqual([]);
    expect(snap.asks).toEqual([]);
  });

  it('get snapshot of non-empty book', () => {
    engine.placeOrder({ asset: 'BTC/USD', side: 'buy', type: 'limit', price: 100, size: 5, trader: '0xTrader', signature: '0xsig' });
    const snap = engine.getSnapshot('BTC/USD');
    expect(snap.bids.length).toBe(1);
  });

  it('emits order event on placeOrder', () => {
    const handler = vi.fn();
    engine.on('order', handler);

    engine.placeOrder({ asset: 'BTC/USD', side: 'buy', type: 'limit', price: 100, size: 5, trader: '0xTrader', signature: '0xsig' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toHaveProperty('id');
  });

  it('emits trade event when orders match', () => {
    const handler = vi.fn();
    engine.on('trade', handler);

    engine.placeOrder({ asset: 'BTC/USD', side: 'sell', type: 'limit', price: 100, size: 5, trader: '0xSeller', signature: '0xsig1' });
    engine.placeOrder({ asset: 'BTC/USD', side: 'buy', type: 'limit', price: 100, size: 5, trader: '0xBuyer', signature: '0xsig2' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toHaveProperty('buyOrderId');
    expect(handler.mock.calls[0][0]).toHaveProperty('sellOrderId');
  });
});
