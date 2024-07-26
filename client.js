const io = require('socket.io-client');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');

  // Enviar un mensaje al servidor
  socket.emit('userMessage', { message: '¿Cuáles son los precios de alquiler en el centro?' });

  // Escuchar respuestas del agente
  socket.on('agentMessage', (data) => {
    console.log('Received message from agent:', data);
  });

  // Escuchar respuestas del usuario
  socket.on('userResponse', (data) => {
    console.log('Received response from user:', data);
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
