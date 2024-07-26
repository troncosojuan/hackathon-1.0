import io from 'socket.io-client';

const socket = io('http://localhost:3000'); // Cambia esto a la dirección de tu servidor

socket.on('connect', () => {
  console.log('Connected to server');

  // Enviar un mensaje de usuario simulando una pregunta sobre alquileres
  socket.emit('userMessage', { message: '¿Cuáles son los precios de alquiler en el centro?' });

  // Escuchar mensajes del agente
  socket.on('agentMessage', (data) => {
    console.log('Received message from agent:', data);
  });

  // Enviar una respuesta del agente
  socket.emit('agentResponse', { message: 'El precio de alquiler en el centro varía entre $500 y $1000.' });

  // Escuchar respuestas al usuario
  socket.on('userResponse', (data) => {
    console.log('Received response from user:', data);
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});