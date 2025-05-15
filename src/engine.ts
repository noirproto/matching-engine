import { EventEmitter } from 'events';
import { Order, Trade, OrderBookSnapshot, OrderStatus } from './types.js';
import { OrderBook } from './orderbook.js';
import { randomUUID } from 'crypto';

export class MatchingEngine extends EventEmitter {
  private books = new Map<string, OrderBook>();
  private orders = new Map<string, Order>();

  placeOrder(params: Omit<Order, 'id' | 'filled' | 'status' | 'timestamp'>): {
    order: Order;
    trades: Trade[];
  } {
    const order: Order = {
      ...params,
      id: randomUUID(),
      filled: 0,
      status: 'open' as OrderStatus,
      timestamp: Date.now(),
    };

    this.orders.set(order.id, order);
    const book = this.getOrCreateBook(order.asset);
    const trades = book.add(order);

    this.emit('order', order);
    for (const trade of trades) this.emit('trade', trade);

    return { order, trades };
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;
    const book = this.getOrCreateBook(order.asset);
    const cancelled = book.cancel(orderId);
    if (cancelled) { order.status = 'cancelled'; this.emit('cancel', order); }
    return cancelled;
  }

  getSnapshot(asset: string): OrderBookSnapshot {
    return this.getOrCreateBook(asset).snapshot();
  }

  getTrades(asset: string): Trade[] {
    return this.getOrCreateBook(asset).getTradeHistory();
  }

  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  private getOrCreateBook(asset: string): OrderBook {
    if (!this.books.has(asset)) this.books.set(asset, new OrderBook(asset));
    return this.books.get(asset)!;
  }
}
