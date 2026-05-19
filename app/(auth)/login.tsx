import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { login } from '@/services/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/services/api/client';
import { runFullSync } from '@/services/sync';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    try {
      setLoading(true);
      const { user, token } = await login({ email: email.trim().toLowerCase(), password });
      setAuth(user, token);

      // Sync data ngay sau login — pull data từ các thiết bị khác
      runFullSync().catch((err) => {
        console.warn('[Login] Initial sync failed:', err.message);
      });

      router.replace('/(tabs)/learn');
    } catch (err) {
      if (err instanceof ApiError) {
        Alert.alert('Đăng nhập thất bại', err.message);
      } else {
        Alert.alert('Lỗi', 'Đã xảy ra lỗi không xác định');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          <View className="items-center mb-10">
            <Text className="text-6xl mb-2">🌙</Text>
            <Text className="text-3xl font-bold text-gray-900">Luna English</Text>
            <Text className="text-gray-500 mt-1">Đăng nhập để tiếp tục</Text>
          </View>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            className="border border-gray-300 rounded-2xl px-4 py-4 mb-3 text-base"
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu"
            secureTextEntry
            editable={!loading}
            className="border border-gray-300 rounded-2xl px-4 py-4 mb-5 text-base"
          />

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className={`rounded-2xl py-4 items-center ${loading ? 'bg-gray-300' : 'bg-indigo-600'}`}
          >
            <Text className="text-white font-bold text-base">
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-600">Chưa có tài khoản? </Text>
            <Link href={"/(auth)/register" as any} className="text-indigo-600 font-semibold">
              Đăng ký
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
