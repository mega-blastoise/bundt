import { z } from 'zod';
import { defineDataSource } from '../src/index';

const PRODUCTS = [
  { id: '1', name: 'Mechanical Keyboard', price: 149.99, category: 'Peripherals', description: 'Cherry MX Brown switches, hot-swappable, RGB backlight. Full aluminum case with PBT keycaps.', stock: 23 },
  { id: '2', name: 'Ultrawide Monitor', price: 599.99, category: 'Displays', description: '34-inch curved IPS panel, 3440x1440, 144Hz refresh rate. USB-C with 90W power delivery.', stock: 8 },
  { id: '3', name: 'Standing Desk', price: 449.99, category: 'Furniture', description: 'Electric sit-stand desk with memory presets. Bamboo top, 48x30 inches. Supports up to 300 lbs.', stock: 15 },
  { id: '4', name: 'Noise-Canceling Headphones', price: 279.99, category: 'Audio', description: 'Active noise cancellation, 30-hour battery. Multipoint Bluetooth, USB-C charging.', stock: 0 },
  { id: '5', name: 'Webcam 4K', price: 89.99, category: 'Peripherals', description: '4K HDR webcam with auto-framing. Built-in privacy shutter and noise-reducing mics.', stock: 42 },
  { id: '6', name: 'Ergonomic Mouse', price: 69.99, category: 'Peripherals', description: 'Vertical ergonomic design, 4000 DPI sensor. Bluetooth + USB-C dongle dual mode.', stock: 31 }
];

export const productsSource = defineDataSource({
  id: 'products',
  name: 'Products API',
  tags: ['ecommerce'],
  params: z.object({
    category: z.string().optional(),
    limit: z.number().optional()
  }),
  returns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    category: z.string()
  })),
  ttl: 30000,
  fetch: async (params) => {
    let results = PRODUCTS.map(({ id, name, price, category }) => ({ id, name, price, category }));
    if (params.category) {
      results = results.filter((p) => p.category === params.category);
    }
    if (params.limit) {
      results = results.slice(0, params.limit);
    }
    return results;
  }
});

export const productDetailSource = defineDataSource({
  id: 'product-detail',
  name: 'Product Detail API',
  tags: ['ecommerce'],
  params: z.object({
    productId: z.string()
  }),
  returns: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    category: z.string(),
    description: z.string(),
    stock: z.number()
  }),
  fetch: async (params) => {
    const product = PRODUCTS.find((p) => p.id === params.productId);
    if (!product) {
      throw new Error(`Product ${params.productId} not found`);
    }
    return product;
  }
});

export const metricsSource = defineDataSource({
  id: 'metrics',
  name: 'Metrics API',
  tags: ['analytics'],
  params: z.object({}),
  returns: z.array(z.object({
    label: z.string(),
    value: z.string(),
    change: z.number()
  })),
  ttl: 10000,
  fetch: async () => [
    { label: 'Revenue', value: '$12,450', change: 12.3 },
    { label: 'Orders', value: '284', change: 8.1 },
    { label: 'Customers', value: '1,029', change: -2.4 },
    { label: 'Avg Order', value: '$43.84', change: 3.7 }
  ]
});
