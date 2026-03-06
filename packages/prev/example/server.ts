#!/usr/bin/env bun

/**
 * Example: E-commerce dashboard composed with @bundt/prev
 *
 * Start:  bun run example/server.ts
 * Then:   Open http://localhost:3001 in your browser (playground UI)
 */

import { createPrevServer } from '../src/index';
import { productList, productDetail, metricsPanel } from './fragments';
import { productsSource, productDetailSource, metricsSource } from './data-sources';

const server = createPrevServer({
  chat: {
    theme: 'dark'
  },
  devMode: true,
  port: 3001,
  hostname: 'localhost',
  dbPath: './example/prev-example.db',
  fragments: [productList as any, productDetail, metricsPanel],
  dataSources: [productsSource, productDetailSource, metricsSource]
});

server.listen();
