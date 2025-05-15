import { Order, Trade, OrderBookLevel, OrderBookSnapshot } from './types.js';
import { randomUUID } from 'crypto';

export class OrderBook {
  private bids: Order[] = [];
  private asks: Order[] = [];
  private trades: Trade[] = [];

  constructor(public readonly asset: string) {}

  add(order: Order): Trade[] {
    if (order.type === 'market') return this.matchMarket(order);
    const trades = this.matchLimit(order);
    if (order.status === 'open' || order.status === 'partial') {
      this.insert(order);
    }
    return trades;
  }

  cancel(orderId: string): boolean {
    const bidIdx = this.bids.findIndex(o => o.id === orderId);
    if (bidIdx !== -1) { this.bids.splice(bidIdx, 1); return true; }
    const askIdx = this.asks.findIndex(o => o.id === orderId);
    if (askIdx !== -1) { this.asks.splice(askIdx, 1); return true; }
    return false;
  }

  snapshot(): OrderBookSnapshot {
    const aggregate = (orders: Order[]): OrderBookLevel[] => {
      const levels = new Map<number, OrderBookLevel>();
      for (const o of orders) {
        const rem = o.size - o.filled;
        const l = levels.get(o.price);
        if (l) { l.size += rem; l.count++; }
        else levels.set(o.price, { price: o.price, size: rem, count: 1 });
      }
      return Array.from(levels.values());
    };
    return {
      asset: this.asset,
      bids: aggregate(this.bids),
      asks: aggregate(this.asks),
      timestamp: Date.now(),
    };
  }

  getTradeHistory(): Trade[] {
    return [...this.trades];
  }

  private matchMarket(order: Order): Trade[] {
    const trades: Trade[] = [];
    const contra = order.side === 'buy' ? this.asks : this.bids;
    let remaining = order.size;

    while (remaining > 0 && contra.length > 0) {
      const best = contra[0];
      const fillSize = Math.min(remaining, best.size - best.filled);
      const trade = this.createTrade(order, best, best.price, fillSize);
      trades.push(trade);
      best.filled += fillSize;
      order.filled += fillSize;
      remaining -= fillSize;
      if (best.filled >= best.size) { best.status = 'filled'; contra.shift(); }
      else best.status = 'partial';
    }
    order.status = order.filled >= order.size ? 'filled' : 'partial';
    return trades;
  }

  private matchLimit(order: Order): Trade[] {
    const trades: Trade[] = [];
    const contra = order.side === 'buy' ? this.asks : this.bids;
    let remaining = order.size - order.filled;

    while (remaining > 0 && contra.length > 0) {
      const best = contra[0];
      const crosses = order.side === 'buy'
        ? order.price >= best.price
        : order.price <= best.price;
      if (!crosses) break;

      const fillSize = Math.min(remaining, best.size - best.filled);
      const trade = this.createTrade(order, best, best.price, fillSize);
      trades.push(trade);
      best.filled += fillSize;
      order.filled += fillSize;
      remaining -= fillSize;
      if (best.filled >= best.size) { best.status = 'filled'; contra.shift(); }
      else best.status = 'partial';
    }

    if (order.filled >= order.size) order.status = 'filled';
    else if (order.filled > 0) order.status = 'partial';
    return trades;
  }

  private insert(order: Order): void {
    if (order.side === 'buy') {
      this.bids.push(order);
      this.bids.sort((a, b) =>
        b.price !== a.price ? b.price - a.price : a.timestamp - b.timestamp);
    } else {
      this.asks.push(order);
      this.asks.sort((a, b) =>
        a.price !== b.price ? a.price - b.price : a.timestamp - b.timestamp);
    }
  }

  private createTrade(taker: Order, maker: Order, price: number, size: number): Trade {
    const trade: Trade = {
      id: randomUUID(),
      asset: this.asset,
      buyOrderId: taker.side === 'buy' ? taker.id : maker.id,
      sellOrderId: taker.side === 'sell' ? taker.id : maker.id,
      price,
      size,
      timestamp: Date.now(),
    };
    this.trades.push(trade);
    return trade;
  }
}
