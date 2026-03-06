import { z } from 'zod';
import { defineFragment } from '../src/index';

export const productList = defineFragment({
  id: 'product-list',
  name: 'Product List',
  description: 'Displays a filterable list of products',
  tags: ['ecommerce', 'list'],
  props: z.object({
    title: z.string().optional()
  }),
  data: {
    products: { source: 'products' }
  },
  interactions: {
    selectProduct: { payload: z.object({ productId: z.string() }) }
  },
  layoutHints: { minWidth: '300px', resizable: true },
  render: ({ props, data }) => {
    const products = (data.products ?? []) as Array<{
      id: string;
      name: string;
      price: number;
      category: string;
    }>;

    return (
      <div style={{ padding: '16px', fontFamily: 'system-ui' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 600 }}>
          {props.title ?? 'Products'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {products.map((product) => (
            <div
              key={product.id}
              data-prev-interaction="selectProduct"
              data-prev-payload={JSON.stringify({ productId: product.id })}
              style={{
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'border-color 0.15s'
              }}
            >
              <div style={{ fontWeight: 500 }}>{product.name}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
                {product.category} — ${product.price.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
});

export const productDetail = defineFragment({
  id: 'product-detail',
  name: 'Product Detail',
  description: 'Shows detailed information about a selected product',
  tags: ['ecommerce', 'detail'],
  props: z.object({
    selectedProductId: z.string().optional()
  }),
  data: {
    detail: { source: 'product-detail' }
  },
  interactions: {
    addToCart: { payload: z.object({ productId: z.string(), quantity: z.number() }) }
  },
  layoutHints: { minWidth: '400px' },
  render: ({ props, data }) => {
    const detail = data.detail as {
      id: string;
      name: string;
      price: number;
      category: string;
      description: string;
      stock: number;
    } | undefined;

    if (!detail) {
      return (
        <div style={{ padding: '16px', fontFamily: 'system-ui' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 600 }}>
            Product Detail
          </h2>
          <p style={{ color: '#94a3b8' }}>Select a product from the list to view details.</p>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px', fontFamily: 'system-ui' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 600 }}>
          {detail.name}
        </h2>
        <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '12px' }}>
          {detail.category}
        </div>
        <p style={{ margin: '0 0 16px', lineHeight: 1.6 }}>{detail.description}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            ${detail.price.toFixed(2)}
          </span>
          <span style={{ color: detail.stock > 0 ? '#22c55e' : '#ef4444', fontSize: '0.875rem' }}>
            {detail.stock > 0 ? `${detail.stock} in stock` : 'Out of stock'}
          </span>
        </div>
        {detail.stock > 0 && (
          <button
            data-prev-interaction="addToCart"
            data-prev-payload={JSON.stringify({ productId: detail.id, quantity: 1 })}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem'
            }}
          >
            Add to Cart
          </button>
        )}
      </div>
    );
  }
});

export const metricsPanel = defineFragment({
  id: 'metrics-panel',
  name: 'Metrics Panel',
  description: 'Displays key metrics as stat cards',
  tags: ['analytics', 'dashboard'],
  props: z.object({}),
  data: {
    metrics: { source: 'metrics' }
  },
  interactions: {},
  render: ({ data }) => {
    const metrics = (data.metrics ?? []) as Array<{
      label: string;
      value: string;
      change: number;
    }>;

    return (
      <div style={{ padding: '16px', fontFamily: 'system-ui' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 600 }}>
          Metrics
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {metrics.map((metric) => (
            <div
              key={metric.label}
              style={{
                padding: '16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {metric.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0' }}>
                {metric.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: metric.change >= 0 ? '#22c55e' : '#ef4444' }}>
                {metric.change >= 0 ? '+' : ''}{metric.change}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
});
