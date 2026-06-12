# Features Directory Structure

This directory contains feature-based modules following separation of concerns principles.

## Structure

Each feature module follows this structure:

```
feature-name/
├── types.ts           # Feature-specific TypeScript types
├── services/          # Business logic layer
│   └── featureService.ts
├── hooks/             # React hooks for state management
│   └── useFeature.ts
├── context/           # React contexts (if needed)
│   └── FeatureContext.tsx
├── components/        # Feature-specific UI components (optional)
└── index.ts           # Barrel exports
```

## Available Features

### Products (`products/`)
- **Types**: `Product`, `ProductOption`, `ProductVariant`, `Review`
- **Service**: `productService` - Product CRUD operations
- **Hooks**: 
  - `useProducts` - Product state management
  - `useProductFilters` - Product filtering logic
- **Context**: `ProductContext` - Product-specific state

**Usage:**
```typescript
import { useProducts, useProductFilters } from '@features/products';

// In component
const { products, addProduct, deleteProduct } = useProducts();
const { searchQuery, setSearchQuery, filteredProducts } = useProductFilters({ products });
```

### Orders (`orders/`)
- **Types**: `Order`, `OrderLineItem`, `OrderStatusHistory`
- **Service**: `orderService` - Order business logic

**Usage:**
```typescript
import { createOrderService } from '@features/orders';

const orderService = createOrderService({
  onOrderAdded: (order) => console.log('Order created:', order)
});
```

### Cart (`cart/`)
- **Types**: `CartItem`, `CartState`
- **Hooks**: `useCart` - Cart management
- **Context**: `CartContext` - Cart-specific state

**Usage:**
```typescript
import { useCart } from '@features/cart';

const { cart, addToCart, removeFromCart, cartTotal } = useCart({
  availableDiscounts: discounts
});
```

### Categories (`categories/`)
- **Types**: `Category`
- **Service**: `categoryService` - Category business logic

### Discounts (`discounts/`)
- **Types**: `Discount`
- **Service**: `discountService` - Discount business logic

## Migration Guide

### Migrating from StoreContext

**Before:**
```typescript
const { products, addProduct } = useStore();
```

**After:**
```typescript
import { useProducts } from '@features/products';

const { products, addProduct } = useProducts();
```

### Using Filters

**Before:**
```typescript
const filteredProducts = products.filter(p => 
  p.name.includes(searchQuery)
);
```

**After:**
```typescript
import { useProductFilters } from '@features/products';

const { searchQuery, setSearchQuery, filteredProducts } = useProductFilters({ products });
```

## Best Practices

1. **Import from feature modules**: Use `@features/*` path aliases
2. **Use hooks for state**: Prefer hooks over direct context access
3. **Services for business logic**: Keep business logic in services, not components
4. **Type safety**: Always import types from feature modules

## Adding New Features

1. Create feature directory: `features/new-feature/`
2. Add `types.ts` with feature-specific types
3. Create `services/` if business logic needed
4. Create `hooks/` for state management
5. Add `context/` if shared state needed
6. Export from `index.ts`
7. Add to main `features/index.ts`
