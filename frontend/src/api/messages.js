// src/api/messages.js
// Direct messages between parents and instructors — thin wrapper around
// the /api/messages endpoints.

import api from "./axios";

export const getConversations = () => api.get("/messages/conversations");
export const getUnreadCount = () => api.get("/messages/unread-count");
export const getThread = (userId) => api.get(`/messages/${userId}`);
export const sendMessage = (recipientId, body) =>
  api.post("/messages", { recipientId, body });
