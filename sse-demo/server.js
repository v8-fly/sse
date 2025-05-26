const express = require("express")
const path = require("path")
const cors = require("cors")

const app = express()
const PORT = 3000

// Enable CORS for all routes
app.use(cors())

// Serve static files (our HTML client)
app.use(express.static("public"))

// Store active SSE connections
const clients = new Map()

// SSE endpoint
app.get("/events", (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  })

  // Generate unique client ID
  const clientId = Date.now() + Math.random()

  // Store client connection
  clients.set(clientId, res)

  console.log(`Client ${clientId} connected. Total clients: ${clients.size}`)

  // Send welcome message
  res.write(
    `data: {"type": "welcome", "message": "Connected to SSE server", "clientId": "${clientId}"}\n\n`
  )

  // Handle client disconnect
  req.on("close", () => {
    clients.delete(clientId)
    console.log(
      `Client ${clientId} disconnected. Total clients: ${clients.size}`
    )
  })

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    if (clients.has(clientId)) {
      res.write(`data: {"type": "heartbeat", "timestamp": ${Date.now()}}\n\n`)
    } else {
      clearInterval(heartbeat)
    }
  }, 30000) // Send heartbeat every 30 seconds
})

// API endpoint to broadcast messages to all clients
app.get("/broadcast/:message", (req, res) => {
  const message = req.params.message
  const data = {
    type: "broadcast",
    message: message,
    timestamp: new Date().toISOString(),
    sender: "server",
  }

  // Send to all connected clients
  clients.forEach((clientRes, clientId) => {
    try {
      clientRes.write(`data: ${JSON.stringify(data)}\n\n`)
    } catch (error) {
      console.log(`Error sending to client ${clientId}:`, error.message)
      clients.delete(clientId)
    }
  })

  res.json({ success: true, message: `Broadcasted to ${clients.size} clients` })
})

// API endpoint to send custom events
app.get("/send-event/:eventType/:message", (req, res) => {
  const { eventType, message } = req.params
  const data = {
    type: eventType,
    message: message,
    timestamp: new Date().toISOString(),
  }

  clients.forEach((clientRes, clientId) => {
    try {
      // Send custom event with event type
      clientRes.write(`event: ${eventType}\n`)
      clientRes.write(`data: ${JSON.stringify(data)}\n\n`)
    } catch (error) {
      console.log(`Error sending to client ${clientId}:`, error.message)
      clients.delete(clientId)
    }
  })

  res.json({
    success: true,
    message: `Sent ${eventType} event to ${clients.size} clients`,
  })
})

// Simulate real-time data (stock prices, notifications, etc.)
let counter = 0
setInterval(() => {
  if (clients.size > 0) {
    counter++
    const data = {
      type: "stock-update",
      symbol: "AAPL",
      price: (150 + Math.random() * 10).toFixed(2),
      change: (Math.random() * 2 - 1).toFixed(2),
      timestamp: new Date().toISOString(),
      id: counter,
    }

    clients.forEach((clientRes, clientId) => {
      try {
        clientRes.write(`id: ${counter}\n`)
        clientRes.write(`event: stock-price\n`)
        clientRes.write(`data: ${JSON.stringify(data)}\n\n`)
      } catch (error) {
        console.log(
          `Error sending stock update to client ${clientId}:`,
          error.message
        )
        clients.delete(clientId)
      }
    })
  }
}, 5000) // Send stock updates every 5 seconds

// Status endpoint
app.get("/status", (req, res) => {
  res.json({
    connectedClients: clients.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`SSE Server running on http://localhost:${PORT}`)
  console.log("Available endpoints:")
  console.log("  GET /events - SSE endpoint")
  console.log("  GET /broadcast/:message - Broadcast message to all clients")
  console.log("  GET /send-event/:eventType/:message - Send custom event")
  console.log("  GET /status - Server status")
})
