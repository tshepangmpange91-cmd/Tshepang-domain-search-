# Tshepang Domain Search

A responsive domain registration lookup website with live RDAP requests through a Node.js server.

## Run locally

Install Node.js 18+ and run:

```bash
npm start
```

Open http://localhost:3000

## Deploy

Deploy the **entire folder** to a Node.js hosting service (e.g. Render Web Service). Set the start command to `npm start`. The service must allow outbound HTTPS requests to IANA and RDAP registries. Static-only hosting such as GitHub Pages or Netlify Drop cannot run this Node server by itself.

## Important limitations

A 404 RDAP response means no public registration record was found, **not** that a domain is guaranteed available for purchase. Registries can restrict lookups, return errors or not support RDAP. A registrar must confirm final purchase eligibility and pricing. This project does not register or sell domains.
