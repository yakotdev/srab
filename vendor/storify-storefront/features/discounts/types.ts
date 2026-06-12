// Discount-related types extracted from main types.ts

export interface Discount {
  id: string;
  code: string;
  percentage: number;
  usageCount: number;
  status: 'Active' | 'Expired';
}
