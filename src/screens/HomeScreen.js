import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }) => {
    const { logout, user } = useContext(AuthContext);

    const getRoleIcon = (role) => {
        switch(role) {
            case 'admin': return 'shield-checkmark';
            case 'mesero': return 'restaurant';
            case 'cajero': return 'cash';
            default: return 'person';
        }
    };

    const QuickAction = ({ icon, title, route, color }) => (
        <TouchableOpacity 
            style={[styles.actionCard, { borderLeftColor: color }]} 
            onPress={() => navigation.navigate(route)}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.actionTitle}>{title}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Hola,</Text>
                        <Text style={styles.userName}>{user?.nombre}</Text>
                    </View>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <Ionicons name="log-out-outline" size={24} color={colors.danger} />
                    </TouchableOpacity>
                </View>

                <View style={styles.roleCard}>
                    <View style={styles.roleIconContainer}>
                        <Ionicons name={getRoleIcon(user?.rol)} size={32} color={colors.surface} />
                    </View>
                    <View style={styles.roleInfo}>
                        <Text style={styles.roleLabel}>Tu Rol Actual</Text>
                        <Text style={styles.roleValue}>{user?.rol?.toUpperCase()}</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
                
                <View style={styles.actionsGrid}>
                    <QuickAction 
                        icon="grid-outline" 
                        title="Gestionar Mesas" 
                        route="Mesas" 
                        color={colors.primary} 
                    />
                    <QuickAction 
                        icon="fast-food-outline" 
                        title="Ver Pedidos" 
                        route="Pedidos" 
                        color={colors.secondary} 
                    />
                    <QuickAction 
                        icon="card-outline" 
                        title="Cuentas y Pagos" 
                        route="Cuentas" 
                        color={colors.success} 
                    />
                    <QuickAction 
                        icon="bar-chart-outline" 
                        title="Reportes" 
                        route="Reportes" 
                        color={colors.info} 
                    />
                </View>
            </ScrollView>
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
        padding: spacing.l,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
        marginTop: spacing.s,
    },
    greeting: {
        fontSize: 16,
        color: colors.textLight,
    },
    userName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
    },
    logoutBtn: {
        padding: spacing.s,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.round,
        ...shadows.small,
    },
    roleCard: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.l,
        padding: spacing.l,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
        ...shadows.medium,
    },
    roleIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    roleInfo: {
        flex: 1,
    },
    roleLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    roleValue: {
        color: colors.surface,
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.m,
    },
    actionsGrid: {
        gap: spacing.m,
    },
    actionCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.m,
        padding: spacing.m,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        ...shadows.small,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    actionTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
});

export default HomeScreen;