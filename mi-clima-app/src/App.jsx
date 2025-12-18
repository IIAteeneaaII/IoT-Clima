import React, { useState, useEffect } from 'react';
import { Cloud, Droplets, Gauge, Wifi } from 'lucide-react';

// 1. Importaciones de AWS Amplify
import { Amplify } from 'aws-amplify';
import { PubSub } from '@aws-amplify/pubsub';
import { CONNECTION_STATE_CHANGE, ConnectionState } from '@aws-amplify/pubsub';
import { Hub } from 'aws-amplify/utils';

// 2. Configuración (Idealmente esto va en un archivo aws-exports.js o .env)
Amplify.configure({
  Auth: {
    Cognito: {
      identityPoolId: 'us-east-1:xxxxxx-xxxx-xxxx-xxxx-xxxxxxxx', // TU IDENTITY POOL ID
      allowGuestAccess: true
    }
  }
});

// Configurar el plugin de PubSub apuntando a tu endpoint de IoT
const pubsubConfig = {
  PubSub: {
    aws_pubsub_region: 'us-east-1', // Tu región
    aws_pubsub_endpoint: 'wss://xxxxxxxx-ats.iot.us-east-1.amazonaws.com/mqtt', // TU IOT ENDPOINT (con wss:// y /mqtt al final)
  }
};
Amplify.configure(pubsubConfig);


export default function WeatherMonitor() {
  const [data, setData] = useState({
    temperature: 0,
    humidity: 0,
    pressure: 0,
    timestamp: new Date()
  });
  
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 3. Escuchar cambios en el estado de conexión (Hub)
    const listener = Hub.listen('pubsub', (data) => {
      const { payload } = data;
      if (payload.event === CONNECTION_STATE_CHANGE) {
        const connectionState = payload.data.connectionState;
        setIsConnected(connectionState === ConnectionState.Connected);
        console.log('Estado de conexión:', connectionState);
      }
    });

    // 4. Suscribirse al tópico MQTT
    // Asegúrate de que tu sensor envíe a este tópico exacto: 'sensores/clima'
    const subscription = PubSub.subscribe('sensores/clima').subscribe({
      next: (data) => {
        console.log('Mensaje recibido:', data);
        // Asumimos que el mensaje llega como { value: { temperature: 25, humidity: 60... } }
        // Adapta esto según la estructura JSON que envíe tu dispositivo
        const incomingData = data.value; 
        
        setData({
          temperature: incomingData.temperature || 0,
          humidity: incomingData.humidity || 0,
          pressure: incomingData.pressure || 0,
          timestamp: new Date()
        });
      },
      error: (error) => {
        console.error('Error en suscripción IoT:', error);
        setIsConnected(false);
      },
      complete: () => console.log('Suscripción cerrada'),
    });

    // Limpieza al desmontar el componente
    return () => {
      subscription.unsubscribe();
      listener(); // Detener listener del Hub
    };
  }, []);

  // --- (El resto de tus funciones de color y renderizado se mantienen igual) ---

  const getTemperatureColor = (temp) => {
    if (temp < 10) return 'from-blue-500 to-cyan-400';
    if (temp < 18) return 'from-cyan-400 to-blue-300';
    if (temp < 24) return 'from-yellow-300 to-yellow-400';
    if (temp < 28) return 'from-yellow-400 to-orange-400';
    if (temp < 32) return 'from-orange-400 to-orange-500';
    return 'from-orange-500 to-red-500';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️ Buenos días';
    if (hour < 19) return '🌤️ Buenas tardes';
    return '🌙 Buenas noches';
  };

  const getHumidityColor = (humidity) => {
    if (humidity < 40) return 'from-yellow-400 to-orange-500';
    if (humidity < 70) return 'from-blue-400 to-cyan-500';
    return 'from-blue-600 to-blue-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-4 shadow-2xl border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              {getGreeting()}
            </h1>
            <div className="flex items-center gap-2">
              <Wifi className={`w-5 h-5 ${isConnected ? 'text-green-300 animate-pulse' : 'text-red-300'}`} />
              <span className="text-white/80 text-sm">
                {isConnected ? 'Conectado IoT' : 'Desconectado'}
              </span>
            </div>
          </div>
          <p className="text-white/70 text-sm">
            Última lectura: {data.timestamp.toLocaleTimeString('es-MX')}
          </p>
        </div>

        {/* Temperatura */}
        <div className={`bg-gradient-to-br ${getTemperatureColor(data.temperature)} rounded-3xl p-6 mb-4 shadow-2xl transform hover:scale-105 transition-all duration-300`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-2 rounded-full">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 13V5a3 3 0 1 0-6 0v8a5 5 0 1 0 6 0zM12 4a1 1 0 0 1 1 1v8.5a3 3 0 1 1-2 0V5a1 1 0 0 1 1-1z"/>
                  </svg>
                </div>
                <h2 className="text-white text-xl font-semibold">Temperatura</h2>
              </div>
              <div className="ml-10">
                <p className="text-5xl font-bold text-white mb-1">
                  {data.temperature.toFixed(2)}°
                </p>
                <p className="text-white/80 text-sm">Celsius</p>
              </div>
            </div>
            {/* Gráfico SVG de temperatura */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="8"
                  strokeDasharray={`${(data.temperature / 50) * 251.2} 251.2`}
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
            </div>
          </div>
        </div>

        {/* Humedad */}
        <div className={`bg-gradient-to-br ${getHumidityColor(data.humidity)} rounded-3xl p-6 mb-4 shadow-2xl transform hover:scale-105 transition-all duration-300`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-2 rounded-full">
                  <Droplets className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-white text-xl font-semibold">Humedad</h2>
              </div>
              <div className="ml-10">
                <p className="text-5xl font-bold text-white mb-1">
                  {data.humidity.toFixed(2)}%
                </p>
                <p className="text-white/80 text-sm">Relativa</p>
              </div>
            </div>
            {/* Gráfico SVG de humedad */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <rect x="20" y="20" width="60" height="60" rx="8" fill="rgba(255,255,255,0.2)" />
                <rect x="20" y={20 + (60 * (1 - data.humidity / 100))} width="60" height={60 * (data.humidity / 100)} rx="8" fill="white" className="transition-all duration-1000" />
              </svg>
            </div>
          </div>
        </div>

        {/* Presión */}
        <div className="bg-gradient-to-br from-purple-400 to-indigo-600 rounded-3xl p-6 shadow-2xl transform hover:scale-105 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-2 rounded-full">
                  <Gauge className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-white text-xl font-semibold">Presión</h2>
              </div>
              <div className="ml-10">
                <p className="text-5xl font-bold text-white mb-1">
                  {data.pressure.toFixed(2)}
                </p>
                <p className="text-white/80 text-sm">hPa</p>
              </div>
            </div>
            {/* Gráfico SVG de presión */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="8"
                  strokeDasharray={`${((data.pressure - 700) / 300) * 251.2} 251.2`}
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-white/60 text-sm">
            Conexión Segura vía AWS IoT Core (MQTT)
          </p>
        </div>
      </div>
    </div>
  );
}