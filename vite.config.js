import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import asfSearchHandler from './api/asf-search.js';
import earthdataAssetHandler from './api/earthdata-asset.js';
import watchpointsHandler from './api/watchpoints.js';

function wrapVercelHandler(handler) {
  return async (req, res) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());

    if (req.method === 'POST' || req.method === 'PUT') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
      }
      const rawBody = Buffer.concat(chunks).toString('utf8');
      try {
        req.body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        req.body = rawBody;
      }
    }

    const vercelRes = {
      statusCode: 200,
      setHeader: (k, v) => res.setHeader(k, v),
      status(code) {
        this.statusCode = code;
        res.statusCode = code;
        return this;
      },
      json(obj) {
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        res.statusCode = this.statusCode;
        res.end(JSON.stringify(obj));
        return this;
      },
      send(body) {
        res.statusCode = this.statusCode;
        res.end(body);
        return this;
      },
      end(body) {
        res.statusCode = this.statusCode;
        res.end(body);
        return this;
      },
    };

    return handler(req, vercelRes);
  };
}

function earthdataAndSupabaseDevProxy(env) {
  return {
    name: 'earthdata-and-supabase-dev-proxy',
    configureServer(server) {
      Object.assign(process.env, env);
      server.middlewares.use(
        '/api/asf-search',
        wrapVercelHandler(asfSearchHandler)
      );
      server.middlewares.use(
        '/api/earthdata-asset',
        wrapVercelHandler(earthdataAssetHandler)
      );
      server.middlewares.use(
        '/api/watchpoints',
        wrapVercelHandler(watchpointsHandler)
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), cesium(), earthdataAndSupabaseDevProxy(env)],
  };
});
