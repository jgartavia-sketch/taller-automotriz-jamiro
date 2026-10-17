# Taller Multiservicios Jamiro — frontend

Aplicación Next.js con portal público, clientes, staff y administración.

Node.js 24 LTS. Copiar `.env.example` a `.env.local` y definir
`NEXT_PUBLIC_API_URL` con el origen HTTPS real de la API, sin `/api` al final.
La variable se incorpora durante la compilación: requiere nuevo build al cambiarla.

```bash
npm ci
npm run lint
npm test
npm run build
npm start
```

Desarrollo: `npm run dev`. En Vercel, framework Next.js, build `npm run build`.
El backend se despliega por separado. Las dos versiones deben actualizarse juntas.
Los recursos de marca originales permanecen en `public/`.
