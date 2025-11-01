import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HOME_TITLE, HOME_SUBTITLE } from '@shared/utils/strings';
import { useAuthContext } from '@shared/contexts/AuthContext';
import { supabase } from '../lib/supabase';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Manual test: useAuthContext hook should provide auth state from context
  const auth = useAuthContext();

  const handleTestDatabase = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username')
        .limit(5);

      if (error) {
        const message = `❌ Error: ${error.message}`;
        setTestResult(message);
        Alert.alert('Database Test Failed', error.message);
      } else {
        const message = `✅ Success! Found ${data.length} user profiles`;
        setTestResult(message);
        Alert.alert('Database Test Passed', `Found ${data.length} user profiles`);
      }
    } catch (err) {
      const message = `❌ Exception: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setTestResult(message);
      Alert.alert('Database Test Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{HOME_TITLE}</Text>
        <Text style={styles.subtitle}>
          {HOME_SUBTITLE}
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.secondaryButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, isLoading && styles.testButtonDisabled]}
            onPress={handleTestDatabase}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>
              {isLoading ? 'Testing...' : '🧪 Test Database'}
            </Text>
          </TouchableOpacity>

          {testResult ? (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>{testResult}</Text>
            </View>
          ) : null}

          {/* Manual test display for AuthContext */}
          <View style={styles.authContextContainer}>
            <Text style={styles.authContextTitle}>🧪 AuthContext Test</Text>
            <View style={styles.authContextContent}>
              <Text style={styles.authContextItem}>
                Loading: <Text style={styles.authContextValue}>{auth.loading ? 'true' : 'false'}</Text>
              </Text>
              <Text style={styles.authContextItem}>
                User: <Text style={styles.authContextValue}>{auth.user ? auth.user.email : 'null'}</Text>
              </Text>
              <Text style={styles.authContextItem}>
                Session: <Text style={styles.authContextValue}>{auth.session ? 'active' : 'null'}</Text>
              </Text>
              <Text style={styles.authContextItem}>
                Error: <Text style={styles.authContextValue}>{auth.error ? auth.error.message : 'null'}</Text>
              </Text>
            </View>
            <Text style={styles.authContextFooter}>
              ✓ Context provides auth state to components
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  authContextContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  authContextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  authContextContent: {
    gap: 4,
  },
  authContextItem: {
    fontSize: 12,
    color: '#1e40af',
  },
  authContextValue: {
    fontFamily: 'monospace',
  },
  authContextFooter: {
    marginTop: 8,
    fontSize: 12,
    color: '#2563eb',
    fontStyle: 'italic',
  },
});
