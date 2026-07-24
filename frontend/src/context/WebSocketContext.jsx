import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [wsData, setWsData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = () => {
    if (!token) return;
    
    // Clear existing connection
    if (ws.current) {
        ws.current.close();
    }

    const socketUrl = 'ws://localhost:5000/ws';
    const socket = new WebSocket(socketUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log('WebSocket: Connected');
      setIsConnected(true);
      
      // Register with token
      socket.send(JSON.stringify({ type: 'register', token }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket Message Received:', data);
        setWsData(data); // Use state to trigger re-renders or custom hooks
      } catch (err) {
        console.error('WebSocket parsing error:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket: Disconnected. Reconnecting in 5s...');
      setIsConnected(false);
      reconnectTimeout.current = setTimeout(connect, 5000);
    };
  };

  useEffect(() => {
    if (token) {
      connect();
    } else {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [token]);

  return (
    <WebSocketContext.Provider value={{ wsData, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
