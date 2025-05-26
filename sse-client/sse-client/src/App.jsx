import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Activity,
  Wifi,
  WifiOff,
  Send,
  Trash2,
  Server,
  BarChart3,
  MessageSquare,
  Heart,
} from "lucide-react"

const SSEReactDemo = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [clientId, setClientId] = useState(null)
  const [events, setEvents] = useState([])
  const [eventCount, setEventCount] = useState(0)
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [customEventType, setCustomEventType] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [serverStatus, setServerStatus] = useState(null)

  const [stats, setStats] = useState({
    welcome: 0,
    broadcast: 0,
    "stock-price": 0,
    heartbeat: 0,
    notification: 0,
  })

  const eventSourceRef = useRef(null)
  const eventsContainerRef = useRef(null)

  // Custom hook for SSE connection
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Clear events when connecting
    setEvents([])
    setEventCount(0)
    setStats({
      welcome: 0,
      broadcast: 0,
      "stock-price": 0,
      heartbeat: 0,
      notification: 0,
    })

    const eventSource = new EventSource("http://localhost:3000/events")
    eventSourceRef.current = eventSource

    // Handle connection open
    eventSource.onopen = () => {
      console.log("SSE connection opened")
      setIsConnected(true)
    }

    // Handle general messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        addEvent(data.type || "message", data, event.lastEventId)

        if (data.type === "welcome") {
          setClientId(data.clientId)
        }
      } catch (error) {
        addEvent("raw", { data: event.data }, event.lastEventId)
      }
    }

    // Handle custom event types
    eventSource.addEventListener("stock-price", (event) => {
      const data = JSON.parse(event.data)
      addEvent("stock-price", data, event.lastEventId)
    })

    eventSource.addEventListener("notification", (event) => {
      const data = JSON.parse(event.data)
      addEvent("notification", data, event.lastEventId)
    })

    eventSource.addEventListener("custom-event", (event) => {
      const data = JSON.parse(event.data)
      addEvent("custom-event", data, event.lastEventId)
    })

    // Handle errors
    eventSource.onerror = (event) => {
      console.log("SSE error:", event)
      addEvent("error", {
        message: "Connection error occurred",
        readyState: eventSource.readyState,
        timestamp: new Date().toISOString(),
      })

      if (eventSource.readyState === EventSource.CLOSED) {
        setIsConnected(false)
        setClientId(null)
      }
    }
  }, [])

  const disconnectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
      setClientId(null)
      addEvent("info", { message: "Manually disconnected from SSE" })
    }
  }, [])

  const addEvent = useCallback((type, data, eventId = null) => {
    const newEvent = {
      id: Date.now() + Math.random(),
      type,
      data,
      eventId,
      timestamp: new Date().toLocaleTimeString(),
    }

    setEvents((prev) => [newEvent, ...prev.slice(0, 49)]) // Keep only last 50 events
    setEventCount((prev) => prev + 1)
    setStats((prev) => ({
      ...prev,
      [type]: (prev[type] || 0) + 1,
    }))
  }, [])

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      alert("Please enter a message to broadcast")
      return
    }

    try {
      const response = await fetch(
        `http://localhost:3000/broadcast/${encodeURIComponent(
          broadcastMessage
        )}`
      )
      const result = await response.json()
      console.log("Broadcast result:", result)
      setBroadcastMessage("")
    } catch (error) {
      console.error("Error sending broadcast:", error)
      alert("Error sending broadcast. Make sure the server is running.")
    }
  }

  const sendCustomEvent = async () => {
    if (!customEventType.trim() || !customMessage.trim()) {
      alert("Please enter both event type and message")
      return
    }

    try {
      const response = await fetch(
        `http://localhost:3000/send-event/${encodeURIComponent(
          customEventType
        )}/${encodeURIComponent(customMessage)}`
      )
      const result = await response.json()
      console.log("Custom event result:", result)
      setCustomEventType("")
      setCustomMessage("")
    } catch (error) {
      console.error("Error sending custom event:", error)
      alert("Error sending custom event. Make sure the server is running.")
    }
  }

  const getServerStatus = async () => {
    try {
      const response = await fetch("http://localhost:3000/status")
      const status = await response.json()
      setServerStatus(status)
      addEvent("server-status", status)
    } catch (error) {
      console.error("Error getting server status:", error)
      alert("Error getting server status. Make sure the server is running.")
    }
  }

  const clearEvents = () => {
    setEvents([])
    setEventCount(0)
    setStats({
      welcome: 0,
      broadcast: 0,
      "stock-price": 0,
      heartbeat: 0,
      notification: 0,
    })
  }

  // Auto-connect on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      connectSSE()
    }, 1000)

    return () => clearTimeout(timer)
  }, [connectSSE])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const StatCard = ({ icon: Icon, label, value, color = "#3b82f6" }) => (
    <div style={styles.statCard}>
      <div style={styles.statIconContainer}>
        <Icon style={{ ...styles.statIcon, color }} />
      </div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.headerCard}>
          <div style={styles.headerContent}>
            <div style={styles.headerTitle}>
              <Activity style={styles.headerIcon} />
              <h1 style={styles.title}>Server-Sent Events React Demo</h1>
            </div>
            <p style={styles.subtitle}>
              Real-time communication from server to client using React
            </p>
          </div>

          {/* Status Bar */}
          <div style={styles.statusBar}>
            <div style={styles.statusLeft}>
              <div style={styles.connectionStatus}>
                {isConnected ? (
                  <Wifi style={styles.connectedIcon} />
                ) : (
                  <WifiOff style={styles.disconnectedIcon} />
                )}
                <span
                  style={
                    isConnected ? styles.connectedText : styles.disconnectedText
                  }
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div style={styles.clientInfo}>
                <strong>Client ID:</strong> {clientId || "-"}
              </div>
            </div>
            <div style={styles.eventInfo}>
              <strong>Events Received:</strong> {eventCount}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={styles.mainGrid}>
          {/* Connection Controls */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <Wifi style={styles.cardIcon} />
              Connection Controls
            </h3>
            <div style={styles.buttonGroup}>
              <button
                onClick={connectSSE}
                disabled={isConnected}
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  ...(isConnected ? styles.disabledButton : {}),
                }}
              >
                Connect to SSE
              </button>
              <button
                onClick={disconnectSSE}
                disabled={!isConnected}
                style={{
                  ...styles.button,
                  ...styles.dangerButton,
                  ...(!isConnected ? styles.disabledButton : {}),
                }}
              >
                Disconnect
              </button>
            </div>

            {/* Stats */}
            <div style={styles.statsGrid}>
              <StatCard
                icon={MessageSquare}
                label="Welcome"
                value={stats.welcome}
                color="#059669"
              />
              <StatCard
                icon={Send}
                label="Broadcasts"
                value={stats.broadcast}
                color="#ea580c"
              />
              <StatCard
                icon={BarChart3}
                label="Stock Updates"
                value={stats["stock-price"]}
                color="#10b981"
              />
              <StatCard
                icon={Heart}
                label="Heartbeats"
                value={stats.heartbeat}
                color="#6b7280"
              />
            </div>
          </div>

          {/* Server Commands */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <Server style={styles.cardIcon} />
              Server Commands
            </h3>
            <div style={styles.commandsContainer}>
              {/* Broadcast */}
              <div>
                <label style={styles.label}>Broadcast Message</label>
                <div style={styles.inputGroup}>
                  <input
                    type="text"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendBroadcast()}
                    placeholder="Enter broadcast message"
                    style={styles.input}
                  />
                  <button
                    onClick={sendBroadcast}
                    style={{ ...styles.button, ...styles.orangeButton }}
                  >
                    <Send style={styles.buttonIcon} />
                  </button>
                </div>
              </div>

              {/* Custom Event */}
              <div>
                <label style={styles.label}>Custom Event</label>
                <div style={styles.customEventContainer}>
                  <input
                    type="text"
                    value={customEventType}
                    onChange={(e) => setCustomEventType(e.target.value)}
                    placeholder="Event type"
                    style={styles.input}
                  />
                  <div style={styles.inputGroup}>
                    <input
                      type="text"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendCustomEvent()}
                      placeholder="Custom message"
                      style={styles.input}
                    />
                    <button
                      onClick={sendCustomEvent}
                      style={{ ...styles.button, ...styles.purpleButton }}
                    >
                      <Send style={styles.buttonIcon} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Server Status */}
              <button
                onClick={getServerStatus}
                style={{
                  ...styles.button,
                  ...styles.indigoButton,
                  width: "100%",
                }}
              >
                Get Server Status
              </button>
            </div>
          </div>

          {/* Server Status Display */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Server Status</h3>
            {serverStatus ? (
              <div style={styles.serverStatusContainer}>
                <div>
                  <strong>Connected Clients:</strong>{" "}
                  {serverStatus.connectedClients}
                </div>
                <div>
                  <strong>Uptime:</strong>{" "}
                  {Math.floor(serverStatus.uptime / 60)}m{" "}
                  {Math.floor(serverStatus.uptime % 60)}s
                </div>
                <div>
                  <strong>Last Updated:</strong>{" "}
                  {new Date(serverStatus.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <p style={styles.placeholder}>
                Click "Get Server Status" to fetch current server information
              </p>
            )}
          </div>
        </div>

        {/* Events Stream */}
        <div style={styles.card}>
          <div style={styles.eventsHeader}>
            <h3 style={styles.cardTitle}>
              <Activity style={styles.cardIcon} />
              Live Events Stream
            </h3>
            <button
              onClick={clearEvents}
              style={{
                ...styles.button,
                ...styles.dangerButton,
                ...styles.clearButton,
              }}
            >
              <Trash2 style={styles.buttonIcon} />
              Clear Events
            </button>
          </div>

          <div ref={eventsContainerRef} style={styles.eventsContainer}>
            {events.length === 0 ? (
              <div style={styles.eventsPlaceholder}>
                {isConnected
                  ? "Waiting for events..."
                  : "Connect to SSE to start receiving events"}
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  style={{
                    ...styles.eventItem,
                    ...getEventStyle(event.type),
                  }}
                >
                  <div style={styles.eventTimestamp}>
                    {event.timestamp}{" "}
                    {event.eventId && `(ID: ${event.eventId})`}
                  </div>
                  <div style={styles.eventType}>Type: {event.type}</div>
                  <pre style={styles.eventData}>
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Event type styling function
const getEventStyle = (type) => {
  const eventStyles = {
    welcome: { borderLeftColor: "#10b981", backgroundColor: "#f0fdf4" },
    broadcast: { borderLeftColor: "#f97316", backgroundColor: "#fff7ed" },
    "stock-price": { borderLeftColor: "#059669", backgroundColor: "#ecfdf5" },
    notification: { borderLeftColor: "#8b5cf6", backgroundColor: "#faf5ff" },
    heartbeat: {
      borderLeftColor: "#6b7280",
      backgroundColor: "#f9fafb",
      opacity: 0.7,
    },
    error: { borderLeftColor: "#ef4444", backgroundColor: "#fef2f2" },
    info: { borderLeftColor: "#3b82f6", backgroundColor: "#eff6ff" },
    "server-status": { borderLeftColor: "#6366f1", backgroundColor: "#eef2ff" },
  }
  return (
    eventStyles[type] || {
      borderLeftColor: "#6b7280",
      backgroundColor: "#f9fafb",
    }
  )
}

// Styles object
const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)",
    padding: "16px",
  },
  maxWidth: {
    maxWidth: "1280px",
    margin: "0 auto",
  },
  headerCard: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    marginBottom: "24px",
    overflow: "hidden",
  },
  headerContent: {
    background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
    color: "white",
    padding: "24px",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },
  headerIcon: {
    width: "32px",
    height: "32px",
  },
  title: {
    fontSize: "30px",
    fontWeight: "bold",
    margin: 0,
  },
  subtitle: {
    color: "#bfdbfe",
    margin: 0,
  },
  statusBar: {
    padding: "16px",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
  statusLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  connectionStatus: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  connectedIcon: {
    width: "20px",
    height: "20px",
    color: "#10b981",
  },
  disconnectedIcon: {
    width: "20px",
    height: "20px",
    color: "#ef4444",
  },
  connectedText: {
    fontWeight: "500",
    color: "#059669",
  },
  disconnectedText: {
    fontWeight: "500",
    color: "#dc2626",
  },
  clientInfo: {
    fontSize: "14px",
    color: "#6b7280",
  },
  eventInfo: {
    fontSize: "14px",
    color: "#6b7280",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "24px",
    marginBottom: "24px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    padding: "24px",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: 0,
    marginBottom: "16px",
  },
  cardIcon: {
    width: "20px",
    height: "20px",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  button: {
    padding: "12px 16px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    color: "white",
  },
  dangerButton: {
    backgroundColor: "#dc2626",
    color: "white",
  },
  orangeButton: {
    backgroundColor: "#ea580c",
    color: "white",
  },
  purpleButton: {
    backgroundColor: "#7c3aed",
    color: "white",
  },
  indigoButton: {
    backgroundColor: "#4f46e5",
    color: "white",
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
    cursor: "not-allowed",
  },
  buttonIcon: {
    width: "16px",
    height: "16px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    marginTop: "24px",
  },
  statCard: {
    backgroundColor: "white",
    padding: "16px",
    borderRadius: "8px",
    textAlign: "center",
    border: "1px solid #e5e7eb",
  },
  statIconContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "8px",
  },
  statIcon: {
    width: "24px",
    height: "24px",
  },
  statValue: {
    fontSize: "32px",
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: "14px",
    color: "#6b7280",
    marginTop: "4px",
  },
  commandsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "8px",
  },
  inputGroup: {
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "12px",
    border: "2px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    transition: "border-color 0.2s",
    outline: "none",
  },
  customEventContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  serverStatusContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "14px",
  },
  placeholder: {
    color: "#6b7280",
    margin: 0,
  },
  eventsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  clearButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  eventsContainer: {
    height: "400px",
    overflowY: "auto",
    border: "2px solid #e5e7eb",
    borderRadius: "8px",
    padding: "16px",
    backgroundColor: "#f9fafb",
  },
  eventsPlaceholder: {
    textAlign: "center",
    color: "#6b7280",
    padding: "48px 0",
  },
  eventItem: {
    borderLeftWidth: "4px",
    borderLeftStyle: "solid",
    padding: "16px",
    borderRadius: "0 8px 8px 0",
    marginBottom: "12px",
    animation: "fadeIn 0.3s ease-out",
  },
  eventTimestamp: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "4px",
  },
  eventType: {
    fontWeight: "600",
    color: "#374151",
    marginBottom: "8px",
  },
  eventData: {
    fontSize: "14px",
    color: "#111827",
    whiteSpace: "pre-wrap",
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    padding: "8px",
    borderRadius: "4px",
    margin: 0,
  },
}

export default SSEReactDemo
