import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';
import io from 'socket.io-client';
import { Alert } from 'react-native';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [socket, setSocket] = useState(null);

    // Inicializar Socket
    useEffect(() => {
        // Conectar al socket
        // Nota: En producción, usar la URL de tu servidor real
        // Usar la misma IP que en axios.js
        const newSocket = io('http://192.168.1.75:3001'); 
        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    // Escuchar eventos globales
    useEffect(() => {
        if (socket && user) {
            socket.on('pedido:actualizado', async (data) => {
                // Verificar si las notificaciones están activadas
                const notifEnabled = await AsyncStorage.getItem('notificationsEnabled');
                if (notifEnabled === 'false') return;

                // Mostrar alerta si el pedido cambia a 'listo' y el usuario es mesero
                if (data.estado === 'listo' && user.rol === 'mesero') {
                    Alert.alert('¡Pedido Listo!', `El pedido de la Mesa ${data.mesaId} está listo para servir.`);
                }
            });
        }

        return () => {
            if (socket) socket.off('pedido:actualizado');
        };
    }, [socket, user]);

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            // Conexión con endpoint real
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;
            
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('user', JSON.stringify(user));
            setUser(user);
        } catch (error) {
            console.log(error);
            alert('Error al iniciar sesión: ' + (error.response?.data?.msg || error.message));
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            setUser(null);
        } catch (e) {
            console.log(e);
        } finally {
            setIsLoading(false);
        }
    };

    const isLoggedIn = async () => {
        try {
            setIsLoading(true);
            let userToken = await AsyncStorage.getItem('token');
            let userInfo = await AsyncStorage.getItem('user');
            
            if (userInfo) {
                setUser(JSON.parse(userInfo));
            }
            setIsLoading(false);
        } catch (e) {
            console.log(`isLoggedIn error ${e}`);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        isLoggedIn();
    }, []);

    return (
        <AuthContext.Provider value={{ login, logout, isLoading, user }}>
            {children}
        </AuthContext.Provider>
    );
};