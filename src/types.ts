export type Side = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export type OrderStatus = 'open' | 'filled' | 'partial' | 'cancelled';

export interface Order {
  id: string;
  asset: string;
  side: Side;
  type: OrderType;
  price: number;
  size: number;
  filled: number;
  status: OrderStatus;
  trader: string;
  signature: string;
  timestamp: number;
}

export interface Trade {
  id: string;
  asset: string;
  buyOrderId: string;
  sellOrderId: string;
  price: number;
  size: number;
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  count: number;
}

export interface OrderBookSnapshot {
  asset: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}
