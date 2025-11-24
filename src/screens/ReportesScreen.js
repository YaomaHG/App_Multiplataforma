import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, TextInput, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { colors, spacing, borderRadius, shadows } from '../theme';

const ReportesScreen = () => {
    const [ventasHoy, setVentasHoy] = useState(null);
    const [corteCaja, setCorteCaja] = useState([]);
    const [ventasCat, setVentasCat] = useState([]);
    const [topProductos, setTopProductos] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [loading, setLoading] = useState(false);

    // Advanced Report State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [advancedReport, setAdvancedReport] = useState(null);
    const [userModalVisible, setUserModalVisible] = useState(false);

    const fetchReportes = async () => {
        setLoading(true);
        try {
            const [resVentas, resCorte, resTop, resStock, resCat] = await Promise.all([
                api.get('/reportes/ventas-diarias'),
                api.get('/reportes/corte-caja'),
                api.get('/reportes/productos-top'),
                api.get('/reportes/inventario'),
                api.get('/reportes/ventas-categoria')
            ]);

            setVentasHoy(resVentas.data);
            setCorteCaja(resCorte.data);
            setTopProductos(resTop.data);
            setLowStock(resStock.data);
            setVentasCat(resCat.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/auth');
            setUsers(res.data);
        } catch (error) { console.error(error); }
    };

    const fetchAdvancedReport = async () => {
        if (!startDate || !endDate) {
            Alert.alert('Error', 'Ingrese fecha inicio y fin (YYYY-MM-DD)');
            return;
        }
        try {
            const params = { startDate, endDate };
            if (selectedUser) params.userId = selectedUser.id;
            
            const res = await api.get('/reportes/avanzado', { params });
            setAdvancedReport(res.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo generar el reporte avanzado');
        }
    };

    const exportReport = async () => {
        if (!ventasHoy) return;

        const html = `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body { font-family: Helvetica, Arial, sans-serif; padding: 20px; }
                        h1 { text-align: center; color: #FF6B6B; }
                        h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 20px; color: #4ECDC4; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                        .label { font-weight: bold; color: #555; }
                        .value { font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Reporte de Ventas</h1>
                    <p style="text-align: center;">Fecha: ${new Date().toLocaleDateString()}</p>

                    <h2>Resumen General</h2>
                    <div class="row">
                        <span class="label">Ventas Totales:</span>
                        <span class="value">$${ventasHoy?.totalVentas?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div class="row">
                        <span class="label">Propinas:</span>
                        <span class="value">$${ventasHoy?.totalPropinas?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div class="row">
                        <span class="label">Mesas Atendidas:</span>
                        <span class="value">${ventasHoy?.mesasAtendidas || 0}</span>
                    </div>

                    <h2>Corte de Caja</h2>
                    <table>
                        <tr>
                            <th>Método</th>
                            <th>Total</th>
                        </tr>
                        ${corteCaja.map(item => `
                            <tr>
                                <td>${item.metodo.toUpperCase()}</td>
                                <td>$${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </table>

                    <h2>Ventas por Categoría</h2>
                    <table>
                        <tr>
                            <th>Categoría</th>
                            <th>Total</th>
                        </tr>
                        ${ventasCat.map(item => `
                            <tr>
                                <td>${item.categoria}</td>
                                <td>$${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </table>

                    <h2>Top Productos</h2>
                    <table>
                        <tr>
                            <th>Producto</th>
                            <th>Vendidos</th>
                        </tr>
                        ${topProductos.map(item => `
                            <tr>
                                <td>${item.Producto?.nombre || 'Desconocido'}</td>
                                <td>${item.totalVendidos}</td>
                            </tr>
                        `).join('')}
                    </table>

                    <h2>Alertas de Inventario (Bajo Stock)</h2>
                    <table>
                        <tr>
                            <th>Producto</th>
                            <th>Stock Actual</th>
                        </tr>
                        ${lowStock.map(item => `
                            <tr>
                                <td>${item.nombre}</td>
                                <td style="color: red; font-weight: bold;">${item.stock}</td>
                            </tr>
                        `).join('')}
                    </table>
                </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo exportar el reporte');
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchReportes();
            fetchUsers();
        }, [])
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Reportes</Text>
                    <TouchableOpacity style={styles.exportBtn} onPress={exportReport}>
                        <Ionicons name="document-text-outline" size={20} color={colors.surface} />
                        <Text style={styles.exportBtnText}>Exportar PDF</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchReportes} />}
                >
                    {/* Resumen de Ventas */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="stats-chart" size={24} color={colors.primary} />
                            <Text style={styles.cardTitle}>Resumen de Hoy</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Ventas Totales</Text>
                            <Text style={styles.statValue}>${ventasHoy?.totalVentas?.toFixed(2) || '0.00'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Propinas</Text>
                            <Text style={styles.statValue}>${ventasHoy?.totalPropinas?.toFixed(2) || '0.00'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Mesas Atendidas</Text>
                            <Text style={styles.statValue}>{ventasHoy?.mesasAtendidas || 0}</Text>
                        </View>
                    </View>

                    {/* Reporte Avanzado */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="calendar-outline" size={24} color={colors.secondary} />
                            <Text style={styles.cardTitle}>Reporte Avanzado</Text>
                        </View>
                        <View style={styles.inputRow}>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Inicio</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="YYYY-MM-DD" 
                                    value={startDate} 
                                    onChangeText={setStartDate} 
                                />
                            </View>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Fin</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="YYYY-MM-DD" 
                                    value={endDate} 
                                    onChangeText={setEndDate} 
                                />
                            </View>
                        </View>
                        <TouchableOpacity style={styles.userSelector} onPress={() => setUserModalVisible(true)}>
                            <Ionicons name="person-outline" size={20} color={colors.textLight} />
                            <Text style={styles.userSelectorText}>
                                {selectedUser ? `Filtrar por: ${selectedUser.nombre}` : 'Filtrar por Mesero (Todos)'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={colors.textLight} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.genBtn} onPress={fetchAdvancedReport}>
                            <Text style={styles.genBtnText}>Generar Reporte</Text>
                        </TouchableOpacity>

                        {advancedReport && (
                            <View style={styles.advResult}>
                                <View style={styles.statRow}><Text style={styles.statLabel}>Ventas</Text><Text style={styles.statValue}>${advancedReport.totalVentas.toFixed(2)}</Text></View>
                                <View style={styles.statRow}><Text style={styles.statLabel}>Propinas</Text><Text style={styles.statValue}>${advancedReport.totalPropinas.toFixed(2)}</Text></View>
                                <View style={styles.statRow}><Text style={styles.statLabel}>Descuentos</Text><Text style={styles.statValue}>${advancedReport.totalDescuentos.toFixed(2)}</Text></View>
                                <View style={styles.statRow}><Text style={styles.statLabel}>Cuentas</Text><Text style={styles.statValue}>{advancedReport.cantidadCuentas}</Text></View>
                            </View>
                        )}
                    </View>

                    {/* Corte de Caja */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="wallet-outline" size={24} color={colors.success} />
                            <Text style={styles.cardTitle}>Corte de Caja (Hoy)</Text>
                        </View>
                        {corteCaja.length === 0 ? (
                            <Text style={styles.emptyText}>No hay pagos registrados hoy.</Text>
                        ) : (
                            corteCaja.map((item, index) => (
                                <View key={index} style={styles.listItem}>
                                    <Text style={styles.listLabel}>{item.metodo.toUpperCase()}</Text>
                                    <Text style={styles.listValue}>${item.total.toFixed(2)}</Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Ventas por Categoría */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="pie-chart-outline" size={24} color={colors.warning} />
                            <Text style={styles.cardTitle}>Ventas por Categoría</Text>
                        </View>
                        {ventasCat.length === 0 ? (
                            <Text style={styles.emptyText}>No hay ventas hoy.</Text>
                        ) : (
                            ventasCat.map((item, index) => (
                                <View key={index} style={styles.listItem}>
                                    <Text style={styles.listLabel}>{item.categoria}</Text>
                                    <Text style={styles.listValue}>${item.total.toFixed(2)}</Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Productos Más Vendidos */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="trophy-outline" size={24} color={colors.info} />
                            <Text style={styles.cardTitle}>Top Productos</Text>
                        </View>
                        {topProductos.length === 0 ? (
                            <Text style={styles.emptyText}>No hay ventas suficientes.</Text>
                        ) : (
                            topProductos.map((item, index) => (
                                <View key={index} style={styles.listItem}>
                                    <Text style={styles.listLabel}>{index + 1}. {item.Producto?.nombre}</Text>
                                    <Text style={styles.listValue}>{item.totalVendidos} vendidos</Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Alertas de Inventario */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
                            <Text style={styles.cardTitle}>Alertas de Inventario</Text>
                        </View>
                        {lowStock.length === 0 ? (
                            <Text style={styles.emptyText}>Todo el inventario está OK.</Text>
                        ) : (
                            lowStock.map((item, index) => (
                                <View key={index} style={styles.listItem}>
                                    <Text style={styles.listLabel}>{item.nombre}</Text>
                                    <Text style={[styles.listValue, { color: colors.danger }]}>{item.stock} unidades</Text>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>

                {/* User Selection Modal */}
                <Modal visible={userModalVisible} transparent={true} animationType="slide" onRequestClose={() => setUserModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Seleccionar Mesero</Text>
                                <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.textLight} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={users}
                                keyExtractor={item => item.id.toString()}
                                ListHeaderComponent={
                                    <TouchableOpacity style={styles.userOption} onPress={() => { setSelectedUser(null); setUserModalVisible(false); }}>
                                        <View style={styles.userAvatar}>
                                            <Ionicons name="people" size={20} color={colors.surface} />
                                        </View>
                                        <Text style={styles.userOptionText}>Todos</Text>
                                    </TouchableOpacity>
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.userOption} onPress={() => { setSelectedUser(item); setUserModalVisible(false); }}>
                                        <View style={[styles.userAvatar, { backgroundColor: colors.secondary }]}>
                                            <Text style={styles.userInitials}>{item.nombre.substring(0, 2).toUpperCase()}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.userOptionText}>{item.nombre}</Text>
                                            <Text style={styles.userRoleText}>{item.rol}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: spacing.m, paddingTop: spacing.l, backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadows.small },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    exportBtn: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: borderRadius.m, alignItems: 'center', gap: spacing.xs },
    exportBtnText: { color: colors.surface, fontWeight: 'bold' },
    
    content: { flex: 1 },
    scrollContent: { padding: spacing.m },
    
    card: { backgroundColor: colors.surface, borderRadius: borderRadius.m, padding: spacing.m, marginBottom: spacing.m, ...shadows.small },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.m, gap: spacing.s, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.s },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
    statLabel: { fontSize: 16, color: colors.textLight },
    statValue: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
    
    inputRow: { flexDirection: 'row', gap: spacing.m, marginBottom: spacing.m },
    inputWrapper: { flex: 1 },
    inputLabel: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.s, padding: spacing.s, backgroundColor: colors.background },
    
    userSelector: { flexDirection: 'row', alignItems: 'center', padding: spacing.m, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.s, marginBottom: spacing.m, backgroundColor: colors.background, gap: spacing.s },
    userSelectorText: { flex: 1, color: colors.text },
    
    genBtn: { backgroundColor: colors.secondary, padding: spacing.m, borderRadius: borderRadius.m, alignItems: 'center' },
    genBtnText: { color: colors.surface, fontWeight: 'bold', fontSize: 16 },
    
    advResult: { marginTop: spacing.m, paddingTop: spacing.m, borderTopWidth: 1, borderTopColor: colors.border },
    
    listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.s, borderBottomWidth: 1, borderBottomColor: colors.border },
    listLabel: { fontSize: 16, color: colors.text },
    listValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    emptyText: { fontStyle: 'italic', color: colors.textLight, textAlign: 'center', padding: spacing.m },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.l, borderTopRightRadius: borderRadius.l, maxHeight: '80%', paddingBottom: spacing.xl },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    
    userOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.m },
    userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    userInitials: { color: colors.surface, fontWeight: 'bold' },
    userOptionText: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    userRoleText: { fontSize: 12, color: colors.textLight },
});

export default ReportesScreen;