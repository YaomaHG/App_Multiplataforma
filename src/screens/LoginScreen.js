import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Switch, Alert, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const { login, isLoading } = useContext(AuthContext);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);

    useEffect(() => {
        (async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            setIsBiometricSupported(compatible);
            
            const savedEmail = await AsyncStorage.getItem('savedEmail');
            const savedPassword = await AsyncStorage.getItem('savedPassword');
            if (savedEmail && savedPassword) {
                setEmail(savedEmail);
                setPassword(savedPassword);
                setRememberMe(true);
            }
        })();
    }, []);

    const handleLogin = async () => {
        if (rememberMe) {
            await AsyncStorage.setItem('savedEmail', email);
            await AsyncStorage.setItem('savedPassword', password);
        } else {
            await AsyncStorage.removeItem('savedEmail');
            await AsyncStorage.removeItem('savedPassword');
        }
        login(email, password);
    };

    const handleBiometricAuth = async () => {
        try {
            const savedEmail = await AsyncStorage.getItem('savedEmail');
            const savedPassword = await AsyncStorage.getItem('savedPassword');
            
            if (!savedEmail || !savedPassword) {
                Alert.alert('Error', 'Debes iniciar sesión manualmente al menos una vez y activar "Recordar usuario" para habilitar la biometría.');
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Autenticación Biométrica',
                fallbackLabel: 'Usar contraseña',
            });

            if (result.success) {
                login(savedEmail, savedPassword);
            } else {
                Alert.alert('Error', 'Autenticación fallida');
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="restaurant" size={40} color={colors.surface} />
                    </View>
                    <Text style={styles.title}>Restaurant App</Text>
                    <Text style={styles.subtitle}>Bienvenido de nuevo</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Correo Electrónico"
                            placeholderTextColor={colors.placeholder}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Contraseña"
                            placeholderTextColor={colors.placeholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>Recordar usuario</Text>
                        <Switch 
                            value={rememberMe} 
                            onValueChange={setRememberMe} 
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                        <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                    </TouchableOpacity>

                    {isBiometricSupported && (
                        <TouchableOpacity style={styles.bioBtn} onPress={handleBiometricAuth}>
                            <Ionicons name="finger-print" size={24} color={colors.primary} />
                            <Text style={styles.bioText}>Usar Biometría</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        padding: spacing.l,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.l,
        ...shadows.medium,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.m,
        ...shadows.small,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textLight,
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: borderRadius.m,
        marginBottom: spacing.m,
        paddingHorizontal: spacing.m,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputIcon: {
        marginRight: spacing.s,
    },
    input: {
        flex: 1,
        height: 50,
        color: colors.text,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.l,
    },
    label: {
        color: colors.text,
        fontSize: 16,
    },
    loginButton: {
        backgroundColor: colors.primary,
        height: 50,
        borderRadius: borderRadius.m,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.m,
        ...shadows.small,
    },
    loginButtonText: {
        color: colors.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
    bioBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.m,
        backgroundColor: colors.background,
        borderRadius: borderRadius.m,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    bioText: {
        color: colors.primary,
        fontWeight: 'bold',
        marginLeft: spacing.s,
        fontSize: 16,
    }
});

export default LoginScreen;