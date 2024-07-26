import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway'; // Ajusta la ruta según la estructura de tu proyecto
import { Server } from 'socket.io';
import axios from 'axios';

jest.mock('axios');

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let serverMock: Server;

  beforeEach(async () => {
    serverMock = {
      emit: jest.fn(),
    } as unknown as Server;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatGateway],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    gateway.server = serverMock; // Simular el servidor WebSocket
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should analyze sentiment', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { sentiment: 'happy' } });
    const sentiment = await gateway.analyzeSentiment('I am very happy');
    expect(sentiment).toBe('happy');
  });

  it('should suggest responses', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { suggestions: ['¡Qué bueno escuchar eso! ¿Hay algo más en lo que te pueda ayudar?'] } });
    const suggestions = await gateway.suggestResponses('happy', 'I am very happy');
    expect(suggestions).toEqual(['¡Qué bueno escuchar eso! ¿Hay algo más en lo que te pueda ayudar?']);
  });

  it('should handle user message', async () => {
    const client = { emit: jest.fn() } as any;
    const payload = { message: 'Hello' };

    // Mockear la respuesta de analyzeSentiment
    (axios.post as jest.Mock).mockImplementation((url, data) => {
      if (url.includes('analyze')) {
        return Promise.resolve({ data: { sentiment: 'happy' } });
      }
      if (url.includes('suggest-responses')) {
        return Promise.resolve({ data: { suggestions: ['¡Qué bueno escuchar eso! ¿Hay algo más en lo que te pueda ayudar?'] } });
      }
      return Promise.reject(new Error('URL no reconocida'));
    });

    await gateway.handleUserMessage(payload, client);

    expect(serverMock.emit).toHaveBeenCalledWith('agentMessage', {
      message: 'Hello',
      sentiment: 'happy',
      suggestions: ['¡Qué bueno escuchar eso! ¿Hay algo más en lo que te pueda ayudar?']
    });
  });
});
