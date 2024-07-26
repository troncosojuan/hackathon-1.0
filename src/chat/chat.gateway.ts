import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GoogleGenerativeAI } from '@google/generative-ai';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;
  private model: any;

  constructor() {
    // Obtiene la clave API de las variables de entorno
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API key is not defined');
    }
    
    // Inicializa el cliente de la IA generativa de Google con la clave API
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  @SubscribeMessage('userMessage')
  async handleUserMessage(
    @MessageBody() payload: { message: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      console.log('Received user message:', payload.message);
      
      // Analiza el sentimiento y genera sugerencias para el mensaje del usuario
      const { sentiment, suggestions } = await this.analyzeAndGenerateSuggestions(payload.message);
      console.log('Generated sentiment:', sentiment);
      console.log('Generated suggestions:', suggestions);

      // Enviar mensaje y sugerencias a la atención al cliente
      this.server.emit('agentMessage', {
        message: payload.message,
        sentiment,
        suggestions,
      });
      console.log('Sent agent message:', { message: payload.message, sentiment, suggestions });
    } catch (error) {
      console.error('Error processing user message:', error);
      throw new WsException('Error processing user message');
    }
  }

  @SubscribeMessage('agentResponse')
  async handleAgentResponse(
    @MessageBody() payload: { message: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    console.log('Received agent response:', payload.message);
    
    // Enviar la respuesta del agente al usuario
    this.server.emit('userResponse', {
      message: payload.message,
    });
  }

  async analyzeAndGenerateSuggestions(message: string): Promise<{ sentiment: string, suggestions: string[] }> {
    // Prompt para generar sugerencias
    const prompt = `Act as a real estate assistant. Analyze the sentiment of the following user's message and provide three specific and helpful responses that an agent can use to assist the user:
    Message: "${message}"
    Only give me three appropriate responses without explanation. The responses should be clear and directly related to the user's question, please give me 3 responses as an array to use in the front page.`;

    // Prompt para analizar el sentimiento
    const sentimentPrompt = `Analyze the sentiment of the following user's message, and provide a sentiment label in 1 word Message: "${message}"`;
    console.log('Generating suggestions and sentiment analysis request:', prompt);

    try {
      // Genera contenido basado en el mensaje del usuario para obtener las sugerencias
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('Generate suggestions and sentiment analysis response:', text);

      if (text) {
        // Divide las sugerencias generadas por líneas y filtra las vacías
        const [sentimentAnalysis, ...generatedSuggestions] = text.split('\n').filter(t => t.trim() !== '');

        // Analiza el sentimiento del mensaje del usuario
        const sentiment = await this.model.generateContent(sentimentPrompt).then(async (res) => {
          const response = await res.response;
          const text = await response.text();
          return text;
        });

        // Asegúrate de que haya al menos 3 sugerencias
        const suggestions = generatedSuggestions.length < 3
          ? this.addCustomSuggestions(generatedSuggestions)
          : generatedSuggestions.slice(0, 3);

        return { sentiment, suggestions };
      } else {
        throw new Error('Suggestion and sentiment analysis generation failed');
      }
    } catch (error) {
      console.error('Error generating suggestions and sentiment analysis:', error.response?.data || error.message);
      throw new Error('Failed to generate suggestions and sentiment analysis');
    }
  }

  // Agrega sugerencias personalizadas si las generadas no son suficientes
  addCustomSuggestions(suggestions: string[]): string[] {
    const additionalSuggestions = [
      'Gracias por tu mensaje. ¿En qué más puedo ayudarte?',
      'Agradecemos tu comentario. ¿Hay algo más que necesites?',
      '¿Puedo asistirte con algo más?',
    ];
    return suggestions.concat(additionalSuggestions).slice(0, 3);
  }
}