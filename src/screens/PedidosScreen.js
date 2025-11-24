import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { colors, spacing, borderRadius, shadows } from '../theme';

const PedidosScreen = ({ route, navigation }) => {
    const { mesaId, numero } = route.params || {};
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    
    // History / Status State
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyOrders, setHistoryOrders] = useState([]);

    useEffect(() => {
        if (!mesaId) {
            Alert.alert('Atención', 'Por favor selecciona una mesa primero', [
                { text: 'Ir a Mesas', onPress: () => navigation.navigate('Mesas') }
            ]);
            return;
        }
        fetchData();
    }, [mesaId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const prodRes = await api.get('/productos');
            setProductos(prodRes.data);
            
            const cats = [...new Set(prodRes.data.map(p => p.Categoria?.nombre).filter(Boolean))];
            setCategorias(cats);
            if (cats.length > 0) setSelectedCategory(cats[0]);

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo cargar el menú');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get(`/pedidos/mesa/${mesaId}`);
            setHistoryOrders(res.data);
            setHistoryModalVisible(true);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo cargar el historial');
        }
    };

    const updateStatus = async (pedidoId, currentStatus) => {
        let nextStatus = '';
        if (currentStatus === 'preparacion') nextStatus = 'listo';
        else if (currentStatus === 'listo') nextStatus = 'servido';
        else return;

        try {
            await api.patch(`/pedidos/estado/${pedidoId}`, { status: nextStatus });
            const res = await api.get(`/pedidos/mesa/${mesaId}`);
            setHistoryOrders(res.data);
        } catch (error) {
            Alert.alert('Error', 'No se pudo actualizar el estado');
        }
    };

    const addToCart = (producto) => {
        setCart(prevCart => {
            const existing = prevCart.find(item => item.id === producto.id);
            if (existing) {
                return prevCart.map(item => 
                    item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
                );
            } else {
                return [...prevCart, { ...producto, cantidad: 1, instrucciones: '' }];
            }
        });
    };

    const updateInstruction = (productoId, text) => {
        setCart(prevCart => 
            prevCart.map(item => 
                item.id === productoId ? { ...item, instrucciones: text } : item
            )
        );
    };

    const removeFromCart = (productoId) => {
        setCart(prevCart => {
            const existing = prevCart.find(item => item.id === productoId);
            if (existing.cantidad > 1) {
                return prevCart.map(item => 
                    item.id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item
                );
            } else {
                return prevCart.filter(item => item.id !== productoId);
            }
        });
    };

    const sendOrder = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            const payload = {
                MesaId: mesaId,
                instrucciones: '', 
                productos: cart.map(item => ({ 
                    id: item.id, 
                    cantidad: item.cantidad,
                    instrucciones: item.instrucciones 
                }))
            };
            
            await api.post('/pedidos', payload);
            Alert.alert('Éxito', 'Pedido enviado a cocina');
            setCart([]);
            setModalVisible(false);
            navigation.navigate('Mesas');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.error || error.response?.data?.msg || 'No se pudo enviar el pedido');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = selectedCategory 
        ? productos.filter(p => p.Categoria?.nombre === selectedCategory)
        : productos;

    const cartTotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    const renderProduct = ({ item }) => (
        <View style={[styles.productCard, item.stock <= 0 && styles.productCardDisabled]}>
            <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.nombre}</Text>
                <Text style={styles.productDesc} numberOfLines={2}>{item.descripcion}</Text>
                <View style={styles.priceRow}>
                    <Text style={styles.productPrice}>${item.precio.toFixed(2)}</Text>
                    <Text style={[styles.stockText, item.stock < 5 ? styles.lowStock : null]}>
                        {item.stock > 0 ? `${item.stock} disp.` : 'Agotado'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity 
                style={[styles.addButton, item.stock <= 0 && styles.addButtonDisabled]} 
                onPress={() => addToCart(item)}
                disabled={item.stock <= 0}
            >
                <Ionicons name="add" size={24} color={colors.surface} />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Mesa {numero}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={fetchHistory} style={[styles.iconBtn, { backgroundColor: colors.info }]}>
                            <Ionicons name="time-outline" size={20} color={colors.surface} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.iconBtn, { backgroundColor: colors.primary }]}>
                            <Ionicons name="cart-outline" size={20} color={colors.surface} />
                            {cart.length > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{cart.reduce((acc, item) => acc + item.cantidad, 0)}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.categoriesContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
                        {categorias.map(cat => (
                            <TouchableOpacity 
                                key={cat} 
                                style={[styles.catButton, selectedCategory === cat && styles.catButtonActive]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <FlatList
                    data={filteredProducts}
                    renderItem={renderProduct}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.productList}
                />

                {/* Cart Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Resumen del Pedido</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.textLight} />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={styles.cartList}>
                                {cart.length === 0 ? (
                                    <View style={styles.emptyCart}>
                                        <Ionicons name="cart-outline" size={48} color={colors.textLight} />
                                        <Text style={styles.emptyCartText}>El carrito está vacío</Text>
                                    </View>
                                ) : (
                                    cart.map(item => (
                                        <View key={item.id} style={styles.cartItemContainer}>
                                            <View style={styles.cartItemHeader}>
                                                <Text style={styles.cartItemName}>{item.nombre}</Text>
                                                <Text style={styles.cartItemPrice}>${(item.precio * item.cantidad).toFixed(2)}</Text>
                                            </View>
                                            
                                            <View style={styles.cartItemControls}>
                                                <View style={styles.qtyControls}>
                                                    <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.qtyBtn}>
                                                        <Ionicons name="remove" size={16} color={colors.text} />
                                                    </TouchableOpacity>
                                                    <Text style={styles.qtyText}>{item.cantidad}</Text>
                                                    <TouchableOpacity onPress={() => addToCart(item)} style={styles.qtyBtn}>
                                                        <Ionicons name="add" size={16} color={colors.text} />
                                                    </TouchableOpacity>
                                                </View>
                                                <TextInput
                                                    style={styles.instructionInput}
                                                    placeholder="Notas (ej. Sin cebolla)"
                                                    value={item.instrucciones}
                                                    onChangeText={(text) => updateInstruction(item.id, text)}
                                                />
                                            </View>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                            
                            <View style={styles.modalFooter}>
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalAmount}>${cartTotal.toFixed(2)}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={[styles.confirmBtn, cart.length === 0 && styles.disabledBtn]} 
                                    onPress={sendOrder}
                                    disabled={cart.length === 0}
                                >
                                    <Text style={styles.confirmBtnText}>Enviar a Cocina</Text>
                                    <Ionicons name="arrow-forward" size={20} color={colors.surface} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* History Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={historyModalVisible}
                    onRequestClose={() => setHistoryModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Historial de Pedidos</Text>
                                <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.textLight} />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={styles.cartList}>
                                {historyOrders.length === 0 ? (
                                    <View style={styles.emptyCart}>
                                        <Ionicons name="time-outline" size={48} color={colors.textLight} />
                                        <Text style={styles.emptyCartText}>No hay pedidos previos</Text>
                                    </View>
                                ) : (
                                    historyOrders.map(order => (
                                        <View key={order.id} style={styles.historyItem}>
                                            <View style={styles.historyHeader}>
                                                <Text style={styles.historyId}>Pedido #{order.id}</Text>
                                                <View style={[
                                                    styles.statusBadge, 
                                                    { backgroundColor: order.estado === 'servido' ? colors.success : (order.estado === 'listo' ? colors.warning : colors.danger) }
                                                ]}>
                                                    <Text style={styles.statusText}>{order.estado.toUpperCase()}</Text>
                                                </View>
                                            </View>
                                            
                                            {order.Productos?.map((p, idx) => (
                                                <Text key={idx} style={styles.historyProduct}>
                                                    • {p.PedidoProducto?.cantidad}x {p.nombre}
                                                </Text>
                                            ))}
                                            
                                            {order.estado !== 'servido' && (
                                                <TouchableOpacity 
                                                    style={styles.advanceBtn}
                                                    onPress={() => updateStatus(order.id, order.estado)}
                                                >
                                                    <Text style={styles.advanceBtnText}>
                                                        Marcar como {order.estado === 'preparacion' ? 'LISTO' : 'SERVIDO'}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))
                                )}
                            </ScrollView>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.m,
        backgroundColor: colors.surface,
        ...shadows.small,
    },


    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: spacing.m },
    title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    headerActions: { flexDirection: 'row', gap: spacing.s },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: colors.danger,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.surface,
    },
    badgeText: { color: colors.surface, fontSize: 10, fontWeight: 'bold' },
    
    categoriesContainer: { backgroundColor: colors.surface, paddingVertical: spacing.s },
    categoriesList: { paddingHorizontal: spacing.m },
    catButton: {
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xs,
        marginRight: spacing.s,
        borderRadius: borderRadius.round,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    catButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catText: { color: colors.textLight, fontWeight: '600' },
    catTextActive: { color: colors.surface },
    
    productList: { padding: spacing.m },
    productCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.m,
        padding: spacing.m,
        marginBottom: spacing.m,
        alignItems: 'center',
        ...shadows.small,
    },
    productCardDisabled: { opacity: 0.6 },
    productInfo: { flex: 1, marginRight: spacing.m },
    productName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    productDesc: { fontSize: 12, color: colors.textLight, marginBottom: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    productPrice: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
    stockText: { fontSize: 12, color: colors.textLight },
    lowStock: { color: colors.danger, fontWeight: 'bold' },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.small,
    },
    addButtonDisabled: { backgroundColor: colors.textLight },
    
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '85%',
        paddingBottom: spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.l,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    cartList: { padding: spacing.m },
    emptyCart: { alignItems: 'center', padding: spacing.xl },
    emptyCartText: { marginTop: spacing.m, color: colors.textLight, fontSize: 16 },
    
    cartItemContainer: {
        marginBottom: spacing.m,
        paddingBottom: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    cartItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.s },
    cartItemName: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
    cartItemPrice: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    cartItemControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
    qtyControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: borderRadius.s },
    qtyBtn: { padding: spacing.s },
    qtyText: { fontSize: 16, fontWeight: 'bold', marginHorizontal: spacing.xs },
    instructionInput: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: borderRadius.s,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        fontSize: 12,
    },
    
    modalFooter: { padding: spacing.l, borderTopWidth: 1, borderTopColor: colors.border },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.l },
    totalLabel: { fontSize: 18, color: colors.text },
    totalAmount: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
    confirmBtn: {
        backgroundColor: colors.success,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.m,
        borderRadius: borderRadius.m,
        gap: spacing.s,
    },
    disabledBtn: { backgroundColor: colors.textLight },
    confirmBtnText: { color: colors.surface, fontSize: 16, fontWeight: 'bold' },
    
    historyItem: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.m,
        padding: spacing.m,
        marginBottom: spacing.m,
    },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.s },
    historyId: { fontWeight: 'bold', color: colors.text },
    statusBadge: { paddingHorizontal: spacing.s, paddingVertical: 2, borderRadius: borderRadius.s },
    statusText: { color: colors.surface, fontSize: 10, fontWeight: 'bold' },
    historyProduct: { color: colors.textLight, marginLeft: spacing.s, marginBottom: 2 },
    advanceBtn: {
        marginTop: spacing.s,
        backgroundColor: colors.info,
        padding: spacing.s,
        borderRadius: borderRadius.s,
        alignItems: 'center',
    },
    advanceBtnText: { color: colors.surface, fontSize: 12, fontWeight: 'bold' },
});

export default PedidosScreen;