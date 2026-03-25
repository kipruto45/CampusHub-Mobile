/**
 * Live Study Rooms Service
 * Handles WebSocket connections for real-time video study sessions
 */

import api from './api';

// Types
export interface StudyRoom {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  room_type: 'study' | 'tutoring' | 'group_project' | 'exam_prep';
  privacy: 'public' | 'private' | 'invite_only';
  host: string;
  host_name: string;
  host_avatar?: string;
  max_participants?: number;
  current_participants: number;
  is_active: boolean;
  is_recording: boolean;
  started_at: string;
  end_time?: string;
  created_at: string;
  participant_count: number;
  is_joined: boolean;
}

export interface RoomParticipant {
  id: string;
  user: string;
  user_name: string;
  user_avatar?: string;
  room: string;
  joined_at: string;
  left_at?: string;
  is_active: boolean;
  is_host: boolean;
}

export interface RoomMessage {
  id: string;
  room: string;
  user: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  message_type: 'text' | 'system' | 'offer' | 'answer' | 'ice_candidate';
  created_at: string;
}

export interface CreateRoomData {
  name: string;
  description?: string;
  subject?: string;
  room_type: 'study' | 'tutoring' | 'group_project' | 'exam_prep';
  privacy: 'public' | 'private' | 'invite_only';
  max_participants?: number;
}

class LiveRoomsService {
  private websocket: WebSocket | null = null;
  private roomId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private messageHandlers: ((message: RoomMessage) => void)[] = [];
  private participantHandlers: ((participants: RoomParticipant[]) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  /**
   * Get all active rooms
   */
  async getRooms(params?: {
    type?: string;
    subject?: string;
    privacy?: string;
  }): Promise<StudyRoom[]> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.subject) queryParams.append('subject', params.subject);
    if (params?.privacy) queryParams.append('privacy', params.privacy);

    const response = await api.get(`/live-rooms/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * AI suggested rooms (server can rerank/semantic match)
   */
  async getAiSuggested(): Promise<StudyRoom[]> {
    const response = await api.get('/ai/recommendations/', { params: { limit: 8, include_popular: true } });
    const payload = response.data?.data?.recommendations || response.data?.data || response.data || [];
    return payload as StudyRoom[];
  }

  /**
   * Get active rooms only
   */
  async getActiveRooms(): Promise<StudyRoom[]> {
    const response = await api.get('/live-rooms/active/');
    return response.data;
  }

  /**
   * Get user's rooms
   */
  async getMyRooms(): Promise<StudyRoom[]> {
    const response = await api.get('/live-rooms/my/');
    return response.data;
  }

  /**
   * Get room details
   */
  async getRoom(roomId: string): Promise<StudyRoom> {
    const response = await api.get(`/live-rooms/${roomId}/`);
    return response.data;
  }

  /**
   * Create a new study room
   */
  async createRoom(data: CreateRoomData): Promise<StudyRoom> {
    const response = await api.post('/live-rooms/', data);
    return response.data;
  }

  /**
   * Join a room
   */
  async joinRoom(roomId: string): Promise<RoomParticipant> {
    const response = await api.post(`/live-rooms/${roomId}/join/`);
    return response.data;
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomId: string): Promise<void> {
    await api.post(`/live-rooms/${roomId}/leave/`);
  }

  /**
   * Get room participants
   */
  async getParticipants(roomId: string): Promise<RoomParticipant[]> {
    const response = await api.get(`/live-rooms/${roomId}/participants/`);
    return response.data;
  }

  /**
   * Get room messages
   */
  async getMessages(roomId: string): Promise<RoomMessage[]> {
    const response = await api.get(`/live-rooms/${roomId}/messages/`);
    return response.data;
  }

  /**
   * Send a message in the room
   */
  async sendMessage(roomId: string, content: string, messageType: 'text' | 'system' = 'text'): Promise<RoomMessage> {
    const response = await api.post(`/live-rooms/${roomId}/messages/`, {
      content,
      message_type: messageType,
    });
    return response.data;
  }

  /**
   * Start recording (host only)
   */
  async startRecording(roomId: string): Promise<void> {
    await api.post(`/live-rooms/${roomId}/recording/start/`);
  }

  /**
   * Stop recording (host only)
   */
  async stopRecording(roomId: string): Promise<void> {
    await api.post(`/live-rooms/${roomId}/recording/stop/`);
  }

  /**
   * Connect to WebSocket for real-time communication
   */
  connect(roomId: string): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.disconnect();
    }

    this.roomId = roomId;
    const token = api.defaults.headers.common['Authorization'] as string;
    const wsUrl = `${process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/rooms/${roomId}/?token=${token}`;

    try {
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.connectionHandlers.forEach(handler => handler(true));
      };

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.connectionHandlers.forEach(handler => handler(false));
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.roomId = null;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Send WebRTC signaling message
   */
  sendSignalingMessage(type: 'offer' | 'answer' | 'ice_candidate', payload: any): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type,
        payload,
      }));
    }
  }

  /**
   * Send chat message via WebSocket
   */
  sendChatMessage(content: string): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'chat',
        content,
      }));
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler: (message: RoomMessage) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Register participant update handler
   */
  onParticipants(handler: (participants: RoomParticipant[]) => void): () => void {
    this.participantHandlers.push(handler);
    return () => {
      this.participantHandlers = this.participantHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Register connection status handler
   */
  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'chat':
        this.messageHandlers.forEach(handler => handler(data.message));
        break;
      case 'participants':
        this.participantHandlers.forEach(handler => handler(data.participants));
        break;
      case 'offer':
      case 'answer':
      case 'ice_candidate':
        // Handle WebRTC signaling
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.roomId) {
      this.reconnectAttempts++;
      setTimeout(() => {
        if (this.roomId) {
          this.connect(this.roomId);
        }
      }, Math.pow(2, this.reconnectAttempts) * 1000);
    }
  }
}

export const liveRoomsService = new LiveRoomsService();
