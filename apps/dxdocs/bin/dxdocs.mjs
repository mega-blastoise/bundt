#!/usr/bin/env node

import { runWithBun } from '@bundt/internal-node-shim';

runWithBun(import.meta.url, { name: 'dxdocs' });
