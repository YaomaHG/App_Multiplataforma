import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { colors, spacing, borderRadius, shadows } from '../theme';

const ConfigScreen = () => {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('menu'); // menu, users, general

    // --- MENU STATE ---
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [menuLoading, setMenuLoading] = useState(false);
    const [menuModalVisible, setMenuModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    // Product Form
    const [prodNombre, setProdNombre] = useState('');
    const [prodPrecio, setProdPrecio] = useState('');
    const [prodDesc, setProdDesc] = useState('');
    const [prodStock, setProdStock] = useState('');
    const [prodCatId, setProdCatId] = useState(null);

    // --- USERS STATE ---
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    // User Form
    const [userNombre, setUserNombre] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userPassword, setUserPassword] = useState('');
    const [userRol, setUserRol] = useState('mesero');

    // --- GENERAL STATE ---
    const [taxRate, setTaxRate] = useState('16');
    const [defaultTipPercent, setDefaultTipPercent] = useState('0');
    const [restaurantName, setRestaurantName] = useState('Mi Restaurante');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        if (activeTab === 'menu') fetchMenuData();
        if (activeTab === 'users') fetchUsersData();
        if (activeTab === 'general') loadGeneralSettings();
    }, [activeTab]);

    // --- MENU LOGIC ---
    const fetchMenuData = async () => {
        setMenuLoading(true);
        try {
            const [prodRes, catRes] = await Promise.all([
                api.get('/productos'),
                api.get('/categorias')
            ]);
            setProductos(prodRes.data);
            setCategorias(catRes.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo cargar el menú');
        } finally {
            setMenuLoading(false);
        }
    };

    const handleSaveProduct = async () => {
        if (!prodNombre || !prodPrecio || !prodCatId) {
            Alert.alert('Error', 'Nombre, precio y categoría son obligatorios');
            return;
        }
        const payload = {
            nombre: prodNombre,
            precio: parseFloat(prodPrecio),
            descripcion: prodDesc,
            stock: parseInt(prodStock) || 0,
            categoriaId: prodCatId
        };
        try {
            if (editingProduct) {
                await api.put(`/productos/${editingProduct.id}`, payload);
                Alert.alert('Éxito', 'Producto actualizado');
            } else {
                await api.post('/productos', payload);
                Alert.alert('Éxito', 'Producto creado');
            }
            setMenuModalVisible(false);
            fetchMenuData();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo guardar el producto');
        }
    };

    const handleDeleteProduct = (id) => {
        Alert.alert('Confirmar', '¿Eliminar producto?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => {
                try { await api.delete(`/productos/${id}`); fetchMenuData(); } 
                catch (e) { Alert.alert('Error', 'No se pudo eliminar'); }
            }}
        ]);
    };

    const openProductModal = (prod = null) => {
        if (prod) {
            setEditingProduct(prod);
            setProdNombre(prod.nombre);
            setProdPrecio(prod.precio.toString());
            setProdDesc(prod.descripcion);
            setProdStock(prod.stock ? prod.stock.toString() : '0');
            setProdCatId(prod.categoriaId);
        } else {
            setEditingProduct(null);
            setProdNombre('');
            setProdPrecio('');
            setProdDesc('');
            setProdStock('');
            setProdCatId(categorias.length > 0 ? categorias[0].id : null);
        }
        setMenuModalVisible(true);
    };

    // --- USERS LOGIC ---
    const fetchUsersData = async () => {
        setUsersLoading(true);
        try {
            const res = await api.get('/auth');
            setUsers(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleSaveUser = async () => {
        if (!userNombre || !userEmail || !userRol) {
            Alert.alert('Error', 'Todos los campos son obligatorios');
            return;
        }
        const payload = { nombre: userNombre, email: userEmail, rol: userRol, password: userPassword };
        try {
            if (editingUser) {
                await api.put(`/auth/${editingUser.id}`, payload);
                Alert.alert('Éxito', 'Usuario actualizado');
            } else {
                if (!userPassword) { Alert.alert('Error', 'Contraseña requerida para nuevo usuario'); return; }
                await api.post('/auth/register', payload);
                Alert.alert('Éxito', 'Usuario creado');
            }
            setUserModalVisible(false);
            fetchUsersData();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo guardar usuario');
        }
    };

    const handleDeleteUser = (id) => {
        Alert.alert('Confirmar', '¿Eliminar usuario?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => {
                try { await api.delete(`/auth/${id}`); fetchUsersData(); } 
                catch (e) { Alert.alert('Error', 'No se pudo eliminar'); }
            }}
        ]);
    };

    const openUserModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setUserNombre(user.nombre);
            setUserEmail(user.email);
            setUserRol(user.rol);
            setUserPassword('');
        } else {
            setEditingUser(null);
            setUserNombre('');
            setUserEmail('');
            setUserRol('mesero');
            setUserPassword('');
        }
        setUserModalVisible(true);
    };

    // --- GENERAL LOGIC ---
    const loadGeneralSettings = async () => {
        try {
            const tax = await AsyncStorage.getItem('taxRate');
            const tip = await AsyncStorage.getItem('defaultTipPercent');
            const name = await AsyncStorage.getItem('restaurantName');
            const notif = await AsyncStorage.getItem('notificationsEnabled');
            if (tax) setTaxRate(tax);
            if (tip) setDefaultTipPercent(tip);
            if (name) setRestaurantName(name);
            if (notif) setNotificationsEnabled(JSON.parse(notif));
        } catch (e) { console.error(e); }
    };

    const saveGeneralSettings = async () => {
        try {
            await AsyncStorage.setItem('taxRate', taxRate);
            await AsyncStorage.setItem('defaultTipPercent', defaultTipPercent);
            await AsyncStorage.setItem('restaurantName', restaurantName);
            await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
            Alert.alert('Éxito', 'Configuración guardada');
        } catch (e) { Alert.alert('Error', 'No se pudo guardar'); }
    };

    if (user?.rol !== 'admin') {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Ionicons name="lock-closed-outline" size={64} color={colors.danger} />
                <Text style={styles.accessDeniedTitle}>Acceso Denegado</Text>
                <Text style={styles.accessDeniedText}>Solo administradores pueden acceder a esta configuración.</Text>
            </View>
        );
    }

    // --- RENDERERS ---
    const renderMenuTab = () => (
        <View style={styles.tabContent}>
            <TouchableOpacity onPress={() => openProductModal()} style={styles.fab}>
                <Ionicons name="add" size={24} color={colors.surface} />
                <Text style={styles.fabText}>Nuevo Producto</Text>
            </TouchableOpacity>
            <FlatList
                data={productos}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle}>{item.nombre}</Text>
                            <Text style={styles.cardSubtitle}>{item.Categoria?.nombre} • Stock: {item.stock}</Text>
                            <Text style={styles.cardPrice}>${item.precio}</Text>
                        </View>
                        <View style={styles.cardActions}>
                            <TouchableOpacity onPress={() => openProductModal(item)} style={[styles.actionBtn, { backgroundColor: colors.warning }]}>
                                <Ionicons name="create-outline" size={20} color={colors.surface} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteProduct(item.id)} style={[styles.actionBtn, { backgroundColor: colors.danger }]}>
                                <Ionicons name="trash-outline" size={20} color={colors.surface} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </View>
    );

    const renderUsersTab = () => (
        <View style={styles.tabContent}>
            <TouchableOpacity onPress={() => openUserModal()} style={styles.fab}>
                <Ionicons name="person-add-outline" size={24} color={colors.surface} />
                <Text style={styles.fabText}>Nuevo Usuario</Text>
            </TouchableOpacity>
            <FlatList
                data={users}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardIcon}>
                            <Ionicons name="person" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle}>{item.nombre}</Text>
                            <Text style={styles.cardSubtitle}>{item.email}</Text>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{item.rol.toUpperCase()}</Text>
                            </View>
                        </View>
                        <View style={styles.cardActions}>
                            <TouchableOpacity onPress={() => openUserModal(item)} style={[styles.actionBtn, { backgroundColor: colors.warning }]}>
                                <Ionicons name="create-outline" size={20} color={colors.surface} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteUser(item.id)} style={[styles.actionBtn, { backgroundColor: colors.danger }]}>
                                <Ionicons name="trash-outline" size={20} color={colors.surface} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </View>
    );

    const renderGeneralTab = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Información del Negocio</Text>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre del Restaurante</Text>
                    <TextInput style={styles.input} value={restaurantName} onChangeText={setRestaurantName} />
                </View>
            </View>
            
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Finanzas</Text>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Impuesto (%)</Text>
                    <TextInput style={styles.input} value={taxRate} onChangeText={setTaxRate} keyboardType="numeric" />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Propina Sugerida (%)</Text>
                    <TextInput style={styles.input} value={defaultTipPercent} onChangeText={setDefaultTipPercent} keyboardType="numeric" />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sistema</Text>
                <View style={styles.switchRow}>
                    <Text style={styles.label}>Notificaciones</Text>
                    <Switch 
                        value={notificationsEnabled} 
                        onValueChange={setNotificationsEnabled}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.surface}
                    />
                </View>
            </View>

            <TouchableOpacity onPress={saveGeneralSettings} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Guardar Configuración</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Configuración</Text>
                </View>

                <View style={styles.tabsContainer}>
                    <TouchableOpacity onPress={() => setActiveTab('menu')} style={[styles.tab, activeTab === 'menu' && styles.activeTab]}>
                        <Ionicons name="restaurant-outline" size={20} color={activeTab === 'menu' ? colors.primary : colors.textLight} />
                        <Text style={[styles.tabText, activeTab === 'menu' && styles.activeTabText]}>Menú</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('users')} style={[styles.tab, activeTab === 'users' && styles.activeTab]}>
                        <Ionicons name="people-outline" size={20} color={activeTab === 'users' ? colors.primary : colors.textLight} />
                        <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Usuarios</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('general')} style={[styles.tab, activeTab === 'general' && styles.activeTab]}>
                        <Ionicons name="settings-outline" size={20} color={activeTab === 'general' ? colors.primary : colors.textLight} />
                        <Text style={[styles.tabText, activeTab === 'general' && styles.activeTabText]}>General</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {activeTab === 'menu' && renderMenuTab()}
                    {activeTab === 'users' && renderUsersTab()}
                    {activeTab === 'general' && renderGeneralTab()}
                </View>

                {/* MENU MODAL */}
                <Modal visible={menuModalVisible} transparent={true} animationType="slide" onRequestClose={() => setMenuModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</Text>
                                <TouchableOpacity onPress={() => setMenuModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.textLight} />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={styles.modalBody}>
                                <Text style={styles.label}>Nombre</Text>
                                <TextInput style={styles.input} placeholder="Ej. Hamburguesa" value={prodNombre} onChangeText={setProdNombre} />
                                
                                <View style={styles.row}>
                                    <View style={{flex: 1, marginRight: spacing.s}}>
                                        <Text style={styles.label}>Precio</Text>
                                        <TextInput style={styles.input} placeholder="0.00" value={prodPrecio} onChangeText={setProdPrecio} keyboardType="numeric" />
                                    </View>
                                    <View style={{flex: 1, marginLeft: spacing.s}}>
                                        <Text style={styles.label}>Stock</Text>
                                        <TextInput style={styles.input} placeholder="0" value={prodStock} onChangeText={setProdStock} keyboardType="numeric" />
                                    </View>
                                </View>
                                
                                <Text style={styles.label}>Descripción</Text>
                                <TextInput style={[styles.input, { height: 80 }]} placeholder="Detalles del producto..." value={prodDesc} onChangeText={setProdDesc} multiline />
                                
                                <Text style={styles.label}>Categoría</Text>
                                <ScrollView horizontal style={styles.catScroll} showsHorizontalScrollIndicator={false}>
                                    {categorias.map(cat => (
                                        <TouchableOpacity key={cat.id} style={[styles.catOption, prodCatId === cat.id && styles.catOptionSelected]} onPress={() => setProdCatId(cat.id)}>
                                            <Text style={[styles.catText, prodCatId === cat.id && styles.catTextSelected]}>{cat.nombre}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </ScrollView>
                            
                            <View style={styles.modalFooter}>
                                <TouchableOpacity onPress={handleSaveProduct} style={styles.saveButton}>
                                    <Text style={styles.saveButtonText}>Guardar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* USER MODAL */}
                <Modal visible={userModalVisible} transparent={true} animationType="slide" onRequestClose={() => setUserModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</Text>
                                <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.textLight} />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={styles.modalBody}>
                                <Text style={styles.label}>Nombre</Text>
                                <TextInput style={styles.input} placeholder="Nombre completo" value={userNombre} onChangeText={setUserNombre} />
                                
                                <Text style={styles.label}>Email</Text>
                                <TextInput style={styles.input} placeholder="correo@ejemplo.com" value={userEmail} onChangeText={setUserEmail} autoCapitalize="none" />
                                
                                <Text style={styles.label}>Contraseña</Text>
                                <TextInput style={styles.input} placeholder="********" value={userPassword} onChangeText={setUserPassword} secureTextEntry />
                                
                                <Text style={styles.label}>Rol</Text>
                                <View style={styles.roleOptions}>
                                    {['admin', 'mesero', 'cajero'].map(r => (
                                        <TouchableOpacity key={r} style={[styles.roleOption, userRol === r && styles.roleOptionSelected]} onPress={() => setUserRol(r)}>
                                            <Ionicons 
                                                name={r === 'admin' ? 'shield' : (r === 'cajero' ? 'cash' : 'restaurant')} 
                                                size={20} 
                                                color={userRol === r ? colors.surface : colors.textLight} 
                                            />
                                            <Text style={[styles.roleOptionText, userRol === r && styles.roleOptionTextSelected]}>{r.toUpperCase()}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                            
                            <View style={styles.modalFooter}>
                                <TouchableOpacity onPress={handleSaveUser} style={styles.saveButton}>
                                    <Text style={styles.saveButtonText}>Guardar</Text>
                                </TouchableOpacity>
                            </View>
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
    centerContent: { justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    accessDeniedTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: spacing.m },
    accessDeniedText: { fontSize: 16, color: colors.textLight, textAlign: 'center', marginTop: spacing.s },
    
    header: { padding: spacing.m, paddingTop: spacing.l, backgroundColor: colors.surface },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    
    tabsContainer: { flexDirection: 'row', backgroundColor: colors.surface, ...shadows.small },
    tab: { flex: 1, padding: spacing.m, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent', flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
    activeTab: { borderBottomColor: colors.primary },
    tabText: { color: colors.textLight, fontWeight: '600' },
    activeTabText: { color: colors.primary },
    
    content: { flex: 1 },
    tabContent: { flex: 1 },
    listContent: { padding: spacing.m, paddingBottom: 80 },
    scrollContent: { padding: spacing.m },
    
    fab: {
        position: 'absolute',
        bottom: spacing.l,
        right: spacing.m,
        backgroundColor: colors.primary,
        paddingVertical: spacing.m,
        paddingHorizontal: spacing.l,
        borderRadius: borderRadius.round,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
        zIndex: 10,
        ...shadows.medium,
    },
    fabText: { color: colors.surface, fontWeight: 'bold', fontSize: 16 },
    
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.m,
        padding: spacing.m,
        marginBottom: spacing.m,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadows.small,
    },
    cardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    cardSubtitle: { fontSize: 14, color: colors.textLight, marginTop: 2 },
    cardPrice: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginTop: 4 },
    roleBadge: {
        backgroundColor: colors.background,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    roleText: { fontSize: 10, fontWeight: 'bold', color: colors.textLight },
    
    cardActions: { flexDirection: 'row', gap: spacing.s },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    section: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.m,
        padding: spacing.m,
        marginBottom: spacing.m,
        ...shadows.small,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: spacing.m },
    inputGroup: { marginBottom: spacing.m },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.s,
        padding: spacing.m,
        fontSize: 16,
    },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    
    saveButton: {
        backgroundColor: colors.success,
        padding: spacing.m,
        borderRadius: borderRadius.m,
        alignItems: 'center',
        marginTop: spacing.s,
        ...shadows.small,
    },
    saveButtonText: { color: colors.surface, fontWeight: 'bold', fontSize: 16 },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.l, borderTopRightRadius: borderRadius.l, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.l, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    modalBody: { padding: spacing.l },
    modalFooter: { padding: spacing.l, borderTopWidth: 1, borderTopColor: colors.border },
    
    row: { flexDirection: 'row' },
    catScroll: { flexDirection: 'row', marginVertical: spacing.s },
    catOption: { paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.round, marginRight: spacing.s },
    catOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    catText: { color: colors.textLight },
    catTextSelected: { color: colors.surface, fontWeight: 'bold' },
    
    roleOptions: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.s },
    roleOption: { flex: 1, padding: spacing.m, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.m, alignItems: 'center', gap: spacing.xs },
    roleOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    roleOptionText: { fontSize: 12, color: colors.textLight },
    roleOptionTextSelected: { color: colors.surface, fontWeight: 'bold' },
});

export default ConfigScreen;