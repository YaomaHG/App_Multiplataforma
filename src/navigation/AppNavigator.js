import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { colors } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import MesasScreen from '../screens/MesasScreen';
import PedidosScreen from '../screens/PedidosScreen';
import CuentasScreen from '../screens/CuentasScreen';
import ReportesScreen from '../screens/ReportesScreen';
import ConfigScreen from '../screens/ConfigScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HomeTabs = () => {
    const { user } = useContext(AuthContext);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Inicio') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Mesas') {
                        iconName = focused ? 'grid' : 'grid-outline';
                    } else if (route.name === 'Pedidos') {
                        iconName = focused ? 'restaurant' : 'restaurant-outline';
                    } else if (route.name === 'Cuentas') {
                        iconName = focused ? 'receipt' : 'receipt-outline';
                    } else if (route.name === 'Reportes') {
                        iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    } else if (route.name === 'Config') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    height: 90,
                    paddingBottom: 30,
                    paddingTop: 13,
                },
                headerShown: false,
            })}
        >
            <Tab.Screen name="Inicio" component={HomeScreen} />
            <Tab.Screen name="Mesas" component={MesasScreen} />
            <Tab.Screen name="Pedidos" component={PedidosScreen} />
            <Tab.Screen name="Cuentas" component={CuentasScreen} />
            <Tab.Screen name="Reportes" component={ReportesScreen} />
            {user?.rol === 'admin' && (
                <Tab.Screen name="Config" component={ConfigScreen} />
            )}
        </Tab.Navigator>
    );
};

const AppNavigator = () => {
    const { user, isLoading } = useContext(AuthContext);

    if (isLoading) {
        return null;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator>
                {user ? (
                    <Stack.Screen 
                        name="HomeTabs" 
                        component={HomeTabs} 
                        options={{ headerShown: false }} 
                    />
                ) : (
                    <Stack.Screen 
                        name="Login" 
                        component={LoginScreen} 
                        options={{ headerShown: false }} 
                    />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;