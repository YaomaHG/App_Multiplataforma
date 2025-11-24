import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { colors, spacing, borderRadius, shadows } from '../theme';

const MesasScreen = ({ navigation }) => {
    const [mesas, setMesas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMesas, setSelectedMesas] = useState([]);

    const fetchMesas = async () => {
        setLoading(true);
        try {
            const response = await api.get('/mesas');
            setMesas(response.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudieron cargar las mesas');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchMesas();
        }, [])
    );

    const handleAddMesa = async () => {
        try {
            const nextNumero = mesas.length > 0 ? Math.max(...mesas.map(m => m.numero)) + 1 : 1;
            await api.post('/mesas', { numero: nextNumero, estado: 'disponible' });
            fetchMesas();
        } catch (error) {
            Alert.alert('Error', 'No se pudo crear la mesa');
        }
    };

    const handleMesaPress = (mesa) => {
        if (selectionMode) {
            toggleSelection(mesa.id);
        } else {
            if (mesa.mesaPrincipalId && mesa.mesaPrincipalId !== mesa.id) {
                const principal = mesas.find(m => m.id === mesa.mesaPrincipalId);
                if (principal) {
                    Alert.alert('Mesa Unida', `Esta mesa está unida a la Mesa ${principal.numero}. Redirigiendo...`, [
                        { text: 'OK', onPress: () => navigation.navigate('Pedidos', { mesaId: principal.id, numero: principal.numero }) }
                    ]);
                    return;
                }
            }
            navigation.navigate('Pedidos', { mesaId: mesa.id, numero: mesa.numero });
        }
    };

    const toggleSelection = (id) => {
        if (selectedMesas.includes(id)) {
            const newSelection = selectedMesas.filter(m => m !== id);
            setSelectedMesas(newSelection);
            if (newSelection.length === 0) setSelectionMode(false);
        } else {
            setSelectedMesas([...selectedMesas, id]);
        }
    };

    const handleCombine = async () => {
        if (selectedMesas.length < 2) {
            Alert.alert('Error', 'Selecciona al menos 2 mesas');
            return;
        }
        try {
            await api.post('/mesas/combinar', { mesasIds: selectedMesas });
            Alert.alert('Éxito', 'Mesas combinadas');
            setSelectionMode(false);
            setSelectedMesas([]);
            fetchMesas();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.msg || 'No se pudieron combinar las mesas');
        }
    };

    const handleSplit = async () => {
        if (selectedMesas.length !== 1) {
            Alert.alert('Error', 'Selecciona una mesa principal para desunir');
            return;
        }
        const mesaId = selectedMesas[0];
        try {
            await api.post(`/mesas/dividir/${mesaId}`);
            Alert.alert('Éxito', 'Mesa dividida/liberada');
            setSelectionMode(false);
            setSelectedMesas([]);
            fetchMesas();
        } catch (error) {
            Alert.alert('Error', 'No se pudo dividir la mesa');
        }
    };

    const getStatusColor = (estado) => {
        switch (estado) {
            case 'disponible': return colors.success;
            case 'ocupada': return colors.danger;
            case 'espera': return colors.warning;
            default: return colors.textLight;
        }
    };

    const renderMesa = ({ item }) => {
        const isSelected = selectedMesas.includes(item.id);
        const statusColor = getStatusColor(item.estado);
        
        return (
            <TouchableOpacity 
                style={[
                    styles.card, 
                    { borderColor: statusColor },
                    isSelected && styles.selectedCard
                ]}
                onPress={() => handleMesaPress(item)}
                onLongPress={() => {
                    setSelectionMode(true);
                    toggleSelection(item.id);
                }}
            >
                {isSelected && (
                    <View style={styles.checkIcon}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    </View>
                )}
                
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                
                <Text style={styles.mesaTitle}>Mesa {item.numero}</Text>
                <Text style={[styles.mesaStatus, { color: statusColor }]}>
                    {item.estado.toUpperCase()}
                </Text>
                
                {item.mesaPrincipalId && item.mesaPrincipalId !== item.id && (
                    <View style={styles.linkedContainer}>
                        <Ionicons name="link" size={12} color={colors.textLight} />
                        <Text style={styles.subText}>
                             Unida a {mesas.find(m => m.id === item.mesaPrincipalId)?.numero}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Mapa de Mesas</Text>
                    {selectionMode ? (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity 
                                style={[styles.iconBtn, { backgroundColor: colors.danger }]} 
                                onPress={() => { setSelectionMode(false); setSelectedMesas([]); }}
                            >
                                <Ionicons name="close" size={20} color={colors.surface} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.iconBtn, { backgroundColor: colors.primary }]} 
                                onPress={handleCombine}
                            >
                                <Ionicons name="git-merge" size={20} color={colors.surface} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.iconBtn, { backgroundColor: colors.warning }]} 
                                onPress={handleSplit}
                            >
                                <Ionicons name="git-network" size={20} color={colors.surface} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddMesa}>
                            <Ionicons name="add" size={24} color={colors.surface} />
                            <Text style={styles.addBtnText}>Nueva Mesa</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={mesas}
                    renderItem={renderMesa}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.columnWrapper}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={fetchMesas} colors={[colors.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="restaurant-outline" size={64} color={colors.textLight} />
                            <Text style={styles.emptyText}>No hay mesas registradas</Text>
                            <Text style={styles.emptySubText}>Pulsa "Nueva Mesa" para comenzar</Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        padding: spacing.m,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.l,
        marginTop: spacing.s,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    addBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        borderRadius: borderRadius.round,
        ...shadows.small,
    },
    addBtnText: {
        color: colors.surface,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.s,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.small,
    },
    list: {
        paddingBottom: spacing.xl,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    card: {
        flex: 0.48,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.m,
        padding: spacing.m,
        marginBottom: spacing.m,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        ...shadows.medium,
        position: 'relative',
    },
    selectedCard: {
        backgroundColor: colors.primary + '10', // 10% opacity
        borderColor: colors.primary,
    },
    checkIcon: {
        position: 'absolute',
        top: 5,
        right: 5,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: spacing.s,
    },
    mesaTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    mesaStatus: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    linkedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.s,
        opacity: 0.7,
    },
    subText: {
        fontSize: 12,
        color: colors.textLight,
        marginLeft: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: spacing.xxl * 2,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: spacing.m,
    },
    emptySubText: {
        fontSize: 14,
        color: colors.textLight,
        marginTop: spacing.s,
    },
});

export default MesasScreen;