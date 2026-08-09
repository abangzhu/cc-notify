const http = require('http')

const PORT = 47823

function createEventServer(onEvent) {
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/event') {
      res.writeHead(404).end()
      return
    }

    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const event = JSON.parse(body)
        onEvent(event)
        res.writeHead(200).end()
      } catch (error) {
        res.writeHead(400).end(String(error.message))
      }
    })
  })

  return server
}

module.exports = { createEventServer, PORT }
