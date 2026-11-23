// Servidor local da API para desenvolvimento (o Vite faz proxy de /api para cá).
import http from 'node:http'
import handler from '../api/router.js'

const port = Number(process.env.API_PORT || 3001)
http.createServer((req, res) => handler(req, res)).listen(port, () => {
  console.log(`API local em http://localhost:${port}`)
})
