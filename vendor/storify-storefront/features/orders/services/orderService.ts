// Order service - extracted from StoreContext
import type { Order } from '../types';
import { ordersApi, activityLogsApi } from '../../../lib/api';

export interface OrderServiceOptions {
  onOrderAdded?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onOrderDeleted?: (id: string) => void;
  onError?: (error: Error, action: string) => void;
  onLogCreated?: (action: string, details: string) => Promise<void>;
}

class OrderService {
  private options: OrderServiceOptions;

  constructor(options: OrderServiceOptions = {}) {
    this.options = options;
  }

  /**
   * Create a new order
   */
  async createOrder(order: Order): Promise<Order> {
    try {
      const newOrder = await ordersApi.create(order);

      // Create activity log
      try {
        await activityLogsApi.create({
          action: 'New Order',
          details: `Order #${newOrder.id} placed by ${newOrder.customerName}`,
          user: 'Admin'
        });
      } catch (logError) {
        console.warn('Failed to create activity log:', logError);
      }

      // Notify callbacks
      if (this.options.onOrderAdded) {
        this.options.onOrderAdded(newOrder);
      }
      if (this.options.onLogCreated) {
        await this.options.onLogCreated('New Order', `Order #${newOrder.id} placed by ${newOrder.customerName}`);
      }

      return newOrder;
    } catch (error: any) {
      console.error('Error creating order:', error);

      if (this.options.onError) {
        this.options.onError(error, 'createOrder');
      }

      throw error;
    }
  }

  /**
   * Update an existing order
   */
  async updateOrder(order: Order): Promise<Order> {
    try {
      const updatedOrder = await ordersApi.update(order.id, order);

      // Create activity log
      try {
        await activityLogsApi.create({
          action: 'Update Order',
          details: `Order #${order.id} status: ${order.status}`,
          user: 'Admin'
        });
      } catch (logError) {
        console.warn('Failed to create activity log:', logError);
      }

      // Notify callbacks
      if (this.options.onOrderUpdated) {
        this.options.onOrderUpdated(updatedOrder);
      }
      if (this.options.onLogCreated) {
        await this.options.onLogCreated('Update Order', `Order #${order.id} status: ${order.status}`);
      }

      return updatedOrder;
    } catch (error: any) {
      console.error('Error updating order:', error);

      if (this.options.onError) {
        this.options.onError(error, 'updateOrder');
      }

      throw error;
    }
  }

  /**
   * Delete an order
   */
  async deleteOrder(id: string): Promise<void> {
    try {
      await ordersApi.delete(id);

      // Create activity log
      try {
        await activityLogsApi.create({
          action: 'Delete Order',
          details: `Order #${id} deleted`,
          user: 'Admin'
        });
      } catch (logError) {
        console.warn('Failed to create activity log:', logError);
      }

      // Notify callbacks
      if (this.options.onOrderDeleted) {
        this.options.onOrderDeleted(id);
      }
      if (this.options.onLogCreated) {
        await this.options.onLogCreated('Delete Order', `Order #${id} deleted`);
      }
    } catch (error: any) {
      console.error('Error deleting order:', error);

      if (this.options.onError) {
        this.options.onError(error, 'deleteOrder');
      }

      throw error;
    }
  }

  /**
   * Get all orders
   */
  async getAllOrders(params?: { status?: string; customerId?: string }): Promise<Order[]> {
    return ordersApi.getAll(params);
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string): Promise<Order> {
    return ordersApi.getById(id);
  }
}

export const createOrderService = (options?: OrderServiceOptions) => new OrderService(options);
