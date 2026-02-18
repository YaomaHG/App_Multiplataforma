import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cambia 'localhost' por tu IP local si pruebas en dispositivo físico
// Ej: http://192.168.1.50:3000/api
const BASE_URL = 'http://192.168.137.125:3001/api'; 

const api = axios.create({
    baseURL: BASE_URL,
});

// Interceptor para agregar el token a cada petición
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;