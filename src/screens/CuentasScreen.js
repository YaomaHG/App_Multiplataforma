import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { colors, spacing, borderRadius, shadows } from '../theme';

const CuentasScreen = () => {
    const [mesasOcupadas, setMesasOcupadas] = useState([]);
    const [selectedMesa, setSelectedMesa] = useState(null);
    const [cuentaDetalle, setCuentaDetalle] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [propina, setPropina] = useState('');
    const [descuento, setDescuento] = useState('');
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [loading, setLoading] = useState(false);
    const [restaurantName, setRestaurantName] = useState('Mi Restaurante');
    const [defaultTipPercent, setDefaultTipPercent] = useState(0);
    
    // Split Bill State
    const [splitModalVisible, setSplitModalVisible] = useState(false);
    const [numPersonas, setNumPersonas] = useState('2');
    const [splitResult, setSplitResult] = useState(null);

    const [montoPagar, setMontoPagar] = useState('');
    const [totalPagado, setTotalPagado] = useState(0);

    const fetchMesasOcupadas = async () => {
        try {
            const res = await api.get('/mesas');
            const ocupadas = res.data.filter(m => m.estado === 'ocupada');
            setMesasOcupadas(ocupadas);
        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchMesasOcupadas();
            setModalVisible(false);
            setSelectedMesa(null);
            loadSettings();
        }, [])
    );

    const loadSettings = async () => {
        const name = await AsyncStorage.getItem('restaurantName');
        const tip = await AsyncStorage.getItem('defaultTipPercent');
        if (name) setRestaurantName(name);
        if (tip) setDefaultTipPercent(parseFloat(tip));
    };

    // Carga los detalles de la cuenta de una mesa seleccionada
    const handleSelectMesa = async (mesa) => {
        setSelectedMesa(mesa);
        setLoading(true);
        try {
            const res = await api.get(`/cuentas/mesa/${mesa.id}`);
            setCuentaDetalle(res.data);
            setTotalPagado(res.data.totalPagado || 0);
            
            // Calcular subtotal real de productos para base de cálculos
            // Se suman los subtotales individuales de cada item
            const subtotalProductos = res.data.items.reduce((acc, item) => acc + item.subtotal, 0);

            // Si ya hay propina guardada en el backend (de una sesión anterior), la respetamos
            if (res.data.cuenta.propina > 0) {
                setPropina(res.data.cuenta.propina.toString());
            } 
            // Si no hay propina y hay configuración por defecto, calculamos el % inicial
            else if (defaultTipPercent > 0) {
                const calcTip = (subtotalProductos * (defaultTipPercent / 100)).toFixed(2);
                setPropina(calcTip);
            } else {
                setPropina('');
            }
            
            // Si ya hay descuento guardado, lo recuperamos
            if (res.data.cuenta.descuento > 0) {
                setDescuento(res.data.cuenta.descuento.toString());
            } else {
                setDescuento('');
            }

            setMontoPagar('');
            setModalVisible(true);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.msg || 'No se pudo cargar la cuenta');
        } finally {
            setLoading(false);
        }
    };

    // Aplica un porcentaje de propina sobre el subtotal de productos
    const applyTipPercentage = (percent) => {
        if (!cuentaDetalle) return;
        // Usar items para calcular base limpia, evitando sumar propinas anteriores
        const subtotalProductos = cuentaDetalle.items.reduce((acc, item) => acc + item.subtotal, 0);
        const calcTip = (subtotalProductos * (percent / 100)).toFixed(2);
        setPropina(calcTip);
    };

    const applyDiscountPercentage = (percent) => {
        if (!cuentaDetalle) return;
        // Usar items para calcular base limpia
        const subtotalProductos = cuentaDetalle.items.reduce((acc, item) => acc + item.subtotal, 0);
        const calcDesc = (subtotalProductos * (percent / 100)).toFixed(2);
        setDescuento(calcDesc);
    };

    // Calcula el total final a pagar
    // Fórmula: (Subtotal Productos - Descuento) + Propina
    const calcularTotalFinal = () => {
        if (!cuentaDetalle) return 0;
        // Recalcular desde items para evitar duplicidad con el total que viene del backend
        const subtotalProductos = cuentaDetalle.items.reduce((acc, item) => acc + item.subtotal, 0);
        
        const prop = parseFloat(propina) || 0;
        const desc = parseFloat(descuento) || 0;
        
        const total = Math.max(0, subtotalProductos - desc) + prop;
        return total.toFixed(2);
    };

    // Calcula cuánto falta por pagar (Total Final - Lo que ya se ha pagado)
    const calcularRestante = () => {
        const total = parseFloat(calcularTotalFinal());
        const pagado = parseFloat(totalPagado) || 0;
        return Math.max(0, total - pagado).toFixed(2);
    };

    // Envía la transacción de pago al backend
    const handleProcesarPago = async () => {
        if (!selectedMesa) return;
        
        const restante = parseFloat(calcularRestante());
        const monto = parseFloat(montoPagar) || restante;

        // Determina si es cierre total o pago parcial
        const esPagoTotal = monto >= restante;
        const actionText = esPagoTotal ? 'Cerrar Cuenta' : 'Registrar Pago Parcial';

        Alert.alert(
            'Confirmar Pago',
            `¿${actionText} de Mesa ${selectedMesa.numero}? Monto: $${monto.toFixed(2)}`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            const res = await api.post(`/cuentas/cerrar/${selectedMesa.id}`, {
                                metodoPago,
                                propina: parseFloat(propina) || 0,
                                descuento: parseFloat(descuento) || 0,
                                monto: monto
                            });

                            if (res.data.estado === 'cerrada') {
                                Alert.alert('Éxito', `Cuenta cerrada. Cambio: $${res.data.cambio?.toFixed(2) || '0.00'}`);
                                setModalVisible(false);
                                fetchMesasOcupadas();
                            } else {
                                Alert.alert('Pago Parcial', `Pago registrado. Restante: $${res.data.restante.toFixed(2)}`);
                                // Recargar datos para actualizar 'totalPagado' y 'restante'
                                handleSelectMesa(selectedMesa);
                            }
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', error.response?.data?.msg || 'No se pudo procesar el pago');
                        }
                    }
                }
            ]
        );
    };

    const handleSplitBill = () => {
        const total = parseFloat(calcularTotalFinal());
        const personas = parseInt(numPersonas);
        if (personas > 0) {
            setSplitResult((total / personas).toFixed(2));
        }
    };

    const printTicket = async () => {
        if (!cuentaDetalle) return;

        // Calcular subtotal de productos para el ticket
        const subtotalProductos = cuentaDetalle.items.reduce((acc, item) => acc + item.subtotal, 0);

        const html = `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                </head>
                <body style="text-align: center; font-family: monospace;">
                    <h1>${restaurantName}</h1>
                    <h2>Mesa ${selectedMesa?.numero}</h2>
                    <hr/>
                    <div style="text-align: left;">
                        ${cuentaDetalle.items.map(item => `
                            <div style="display: flex; justify-content: space-between;">
                                <span>${item.cantidad}x ${item.producto}</span>
                                <span>$${item.subtotal.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <hr/>
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>Subtotal:</span>
                        <span>$${subtotalProductos.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Descuento:</span>
                        <span>-$${(parseFloat(descuento) || 0).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Propina:</span>
                        <span>$${(parseFloat(propina) || 0).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 20px; margin-top: 10px;">
                        <span>TOTAL:</span>
                        <span>$${calcularTotalFinal()}</span>
                    </div>
                    <br/>
                    <p>¡Gracias por su visita!</p>
                </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo generar el ticket');
        }
    };

    const renderMesaItem = ({ item }) => (
        <TouchableOpacity style={styles.mesaCard} onPress={() => handleSelectMesa(item)}>
            <View style={styles.mesaIcon}>
                <Ionicons name="restaurant" size={24} color={colors.primary} />
            </View>
            <View style={styles.mesaInfo}>
                <Text style={styles.mesaTitle}>Mesa {item.numero}</Text>
                <Text style={styles.mesaSubtitle}>Toca para cobrar</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Cuentas por Cobrar</Text>
                </View>
                
                <FlatList
                    data={mesasOcupadas}
                    renderItem={renderMesaItem}
                    keyExtractor={item => item.id.toString()}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={64} color={colors.textLight} />
                            <Text style={styles.emptyText}>No hay mesas ocupadas</Text>
                        </View>
                    }
                    contentContainerStyle={styles.list}
                />

                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Mesa {selectedMesa?.numero}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.itemsList}>
                            {cuentaDetalle?.items.map((item, index) => (
                                <View key={index} style={styles.itemRow}>
                                    <Text style={styles.itemName}>{item.cantidad}x {item.producto}</Text>
                                    <Text style={styles.itemPrice}>${item.subtotal.toFixed(2)}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.footer}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.label}>Subtotal</Text>
                                <Text style={styles.value}>${cuentaDetalle?.cuenta.total.toFixed(2)}</Text>
                            </View>
                            
                            <View style={styles.inputGroup}>
                                <View style={styles.inputLabelRow}>
                                    <Text style={styles.label}>Descuento</Text>
                                    <View style={styles.percentButtons}>
                                        {[10, 20, 50].map(p => (
                                            <TouchableOpacity key={p} onPress={() => applyDiscountPercentage(p)} style={styles.percentBtn}>
                                                <Text style={styles.percentBtnText}>{p}%</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    value={descuento}
                                    onChangeText={setDescuento}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.inputLabelRow}>
                                    <Text style={styles.label}>Propina</Text>
                                    <View style={styles.percentButtons}>
                                        {[10, 15, 20].map(p => (
                                            <TouchableOpacity key={p} onPress={() => applyTipPercentage(p)} style={styles.percentBtn}>
                                                <Text style={styles.percentBtnText}>{p}%</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    value={propina}
                                    onChangeText={setPropina}
                                />
                            </View>

                            <View style={styles.paymentMethods}>
                                {['efectivo', 'tarjeta', 'transferencia'].map(m => (
                                    <TouchableOpacity 
                                        key={m} 
                                        style={[styles.methodBtn, metodoPago === m && styles.methodBtnActive]}
                                        onPress={() => setMetodoPago(m)}
                                    >
                                        <Ionicons 
                                            name={m === 'efectivo' ? 'cash-outline' : (m === 'tarjeta' ? 'card-outline' : 'phone-portrait-outline')} 
                                            size={20} 
                                            color={metodoPago === m ? colors.surface : colors.textLight} 
                                        />
                                        <Text style={[styles.methodText, metodoPago === m && styles.methodTextActive]}>
                                            {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.totalsContainer}>
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalValue}>${calcularTotalFinal()}</Text>
                                </View>
                                <View style={styles.totalRow}>
                                    <Text style={styles.subTotalLabel}>Pagado</Text>
                                    <Text style={[styles.subTotalValue, { color: colors.info }]}>${totalPagado.toFixed(2)}</Text>
                                </View>
                                <View style={[styles.totalRow, styles.restanteRow]}>
                                    <Text style={styles.restanteLabel}>RESTANTE</Text>
                                    <Text style={styles.restanteValue}>${calcularRestante()}</Text>
                                </View>
                            </View>

                            <View style={styles.payInputContainer}>
                                <Text style={styles.payInputLabel}>Monto a Pagar:</Text>
                                <TextInput
                                    style={styles.payInput}
                                    keyboardType="numeric"
                                    placeholder={`$${calcularRestante()}`}
                                    value={montoPagar}
                                    onChangeText={setMontoPagar}
                                />
                            </View>

                            <TouchableOpacity style={styles.mainActionBtn} onPress={handleProcesarPago}>
                                <Text style={styles.mainActionText}>
                                    {(parseFloat(montoPagar) || parseFloat(calcularRestante())) >= parseFloat(calcularRestante()) 
                                        ? 'CERRAR CUENTA' 
                                        : 'REGISTRAR PAGO'}
                                </Text>
                                <Ionicons name="checkmark-circle" size={24} color={colors.surface} />
                            </TouchableOpacity>

                            <View style={styles.secondaryActions}>
                                <TouchableOpacity style={styles.secondaryBtn} onPress={printTicket}>
                                    <Ionicons name="print-outline" size={20} color={colors.text} />
                                    <Text style={styles.secondaryBtnText}>Ticket</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setSplitModalVisible(true); setSplitResult(null); }}>
                                    <Ionicons name="people-outline" size={20} color={colors.text} />
                                    <Text style={styles.secondaryBtnText}>Dividir</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal
                    visible={splitModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSplitModalVisible(false)}
                >
                    <View style={styles.overlay}>
                        <View style={styles.dialog}>
                            <Text style={styles.dialogTitle}>Dividir Cuenta</Text>
                            
                            <View style={styles.dialogContent}>
                                <Text style={styles.dialogLabel}>Número de personas:</Text>
                                <TextInput
                                    style={styles.dialogInput}
                                    keyboardType="numeric"
                                    value={numPersonas}
                                    onChangeText={setNumPersonas}
                                />
                                
                                <TouchableOpacity style={styles.calcBtn} onPress={handleSplitBill}>
                                    <Text style={styles.calcBtnText}>Calcular</Text>
                                </TouchableOpacity>

                                {splitResult && (
                                    <View style={styles.resultBox}>
                                        <Text style={styles.resultLabel}>Total por persona</Text>
                                        <Text style={styles.resultAmount}>${splitResult}</Text>
                                        
                                        <TouchableOpacity 
                                            style={styles.useAmountBtn} 
                                            onPress={() => {
                                                setMontoPagar(splitResult);
                                                setSplitModalVisible(false);
                                            }}
                                        >
                                            <Text style={styles.useAmountText}>Usar este monto</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity style={styles.closeDialogBtn} onPress={() => setSplitModalVisible(false)}>
                                <Text style={styles.closeDialogText}>Cancelar</Text>
                            </TouchableOpacity>
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
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.m },

    headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    list: { paddingBottom: spacing.xl },
    emptyContainer: { alignItems: 'center', marginTop: spacing.xxl * 2 },
    emptyText: { marginTop: spacing.m, fontSize: 16, color: colors.textLight },
    
    mesaCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.m,
        padding: spacing.m,
        marginBottom: spacing.m,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadows.small,
    },
    mesaIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    mesaInfo: { flex: 1 },
    mesaTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    mesaSubtitle: { fontSize: 14, color: colors.textLight },
    
    modalContainer: { flex: 1, backgroundColor: colors.surface },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.l,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    itemsList: { flex: 1, padding: spacing.m },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    itemName: { fontSize: 16, color: colors.text },
    itemPrice: { fontSize: 16, fontWeight: '600', color: colors.text },
    
    footer: {
        padding: spacing.m,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.s },
    label: { fontSize: 14, color: colors.textLight, fontWeight: '600' },
    value: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    
    inputGroup: { marginBottom: spacing.s },
    inputLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    percentButtons: { flexDirection: 'row', gap: 4 },
    percentBtn: { backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    percentBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.text },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.s,
        padding: spacing.s,
        textAlign: 'right',
        fontSize: 16,
    },
    
    paymentMethods: { flexDirection: 'row', gap: spacing.s, marginVertical: spacing.m },
    methodBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.s,
        borderRadius: borderRadius.s,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
    },
    methodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    methodText: { fontSize: 12, color: colors.textLight },
    methodTextActive: { color: colors.surface, fontWeight: 'bold' },
    
    totalsContainer: { marginVertical: spacing.m, padding: spacing.m, backgroundColor: colors.surface, borderRadius: borderRadius.m },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
    subTotalLabel: { fontSize: 14, color: colors.textLight },
    subTotalValue: { fontSize: 14, fontWeight: '600' },
    restanteRow: { marginTop: spacing.s, paddingTop: spacing.s, borderTopWidth: 1, borderTopColor: colors.border },
    restanteLabel: { fontSize: 16, fontWeight: 'bold', color: colors.danger },
    restanteValue: { fontSize: 20, fontWeight: 'bold', color: colors.danger },
    
    payInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.m },
    payInputLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
    payInput: {
        width: 150,
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'right',
        padding: spacing.xs,
    },
    
    mainActionBtn: {
        backgroundColor: colors.success,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.m,
        borderRadius: borderRadius.m,
        gap: spacing.s,
        marginBottom: spacing.m,
        ...shadows.medium,
    },
    mainActionText: { color: colors.surface, fontSize: 16, fontWeight: 'bold' },
    
    secondaryActions: { flexDirection: 'row', gap: spacing.m },
    secondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.s,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.s,
        gap: spacing.s,
    },
    secondaryBtnText: { color: colors.text, fontWeight: '600' },
    
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    dialog: { backgroundColor: colors.surface, width: '85%', borderRadius: borderRadius.l, padding: spacing.l, ...shadows.large },
    dialogTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: spacing.l },
    dialogContent: { alignItems: 'center' },
    dialogLabel: { fontSize: 16, color: colors.text, marginBottom: spacing.s },
    dialogInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.s,
        width: '100%',
        padding: spacing.m,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: spacing.m,
    },
    calcBtn: { backgroundColor: colors.primary, padding: spacing.m, borderRadius: borderRadius.s, width: '100%', alignItems: 'center' },
    calcBtnText: { color: colors.surface, fontWeight: 'bold' },
    resultBox: { marginTop: spacing.l, alignItems: 'center', width: '100%' },
    resultLabel: { fontSize: 14, color: colors.textLight },
    resultAmount: { fontSize: 32, fontWeight: 'bold', color: colors.success, marginVertical: spacing.s },
    useAmountBtn: { backgroundColor: colors.success, padding: spacing.s, borderRadius: borderRadius.s, width: '100%', alignItems: 'center' },
    useAmountText: { color: colors.surface, fontWeight: 'bold' },
    closeDialogBtn: { marginTop: spacing.l, padding: spacing.s, alignSelf: 'center' },
    closeDialogText: { color: colors.textLight, fontSize: 16 },
});

export default CuentasScreen;