import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Pill,
  Star,
  Clock,
  MapPin,
  Shield,
  Upload,
  Camera,
  FileText,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { vendorApi, orderApi } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { Card, LoadingSpinner, EmptyState, Button } from '../../components/shared';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { formatCurrency, formatDate, t } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Store, Prescription, PrescriptionStatus } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
const { width } = Dimensions.get('window');

const STATUS_CONFIG: Record<PrescriptionStatus, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  pending: {
    color: '#d97706',
    bgColor: '#fef3c7',
    icon: <AlertCircle size={14} color="#d97706" />,
    label: 'Pending Review',
  },
  verified: {
    color: '#059669',
    bgColor: '#d1fae5',
    icon: <CheckCircle size={14} color="#059669" />,
    label: 'Verified',
  },
  rejected: {
    color: '#dc2626',
    bgColor: '#fee2e2',
    icon: <XCircle size={14} color="#dc2626" />,
    label: 'Rejected',
  },
  expired: {
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: <AlertCircle size={14} color="#6b7280" />,
    label: 'Expired',
  },
};

export function PharmacyScreen() {
  const navigation = useNavigation<Nav>();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'browse' | 'prescriptions'>('browse');
  const [pharmacies, setPharmacies] = useState<Store[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Upload form state
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState('');
  const [doctorLicense, setDoctorLicense] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchPharmacies = useCallback(async () => {
    try {
      const res = await vendorApi.get('/vendors/stores', { params: { category: 'pharmacy' } });
      setPharmacies(res.data.data ?? []);
    } catch {
      setPharmacies([]);
    }
  }, []);

  const fetchPrescriptions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await orderApi.get('/orders/prescriptions/me');
      setPrescriptions(res.data.data ?? []);
    } catch {
      setPrescriptions([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchPharmacies(), fetchPrescriptions()]).finally(() => setIsLoading(false));
  }, [fetchPharmacies, fetchPrescriptions]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchPharmacies(), fetchPrescriptions()]);
    setIsRefreshing(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('pharmacy.permissionTitle'), t('pharmacy.permissionMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('pharmacy.permissionTitle'), t('pharmacy.cameraPermissionMessage'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!uploadImage) return;
    setIsUploading(true);
    try {
      await orderApi.post('/orders/prescriptions', {
        image_url: uploadImage,
        image_hash: `${Date.now()}`,
        doctor_name: doctorName || undefined,
        doctor_license: doctorLicense || undefined,
        prescription_date: prescriptionDate || undefined,
      });
      Alert.alert(t('pharmacy.uploadSuccess'), t('pharmacy.uploadSuccessMessage'));
      setShowUpload(false);
      setUploadImage(null);
      setDoctorName('');
      setDoctorLicense('');
      setPrescriptionDate('');
      fetchPrescriptions();
    } catch {
      Alert.alert(t('common.error'), t('pharmacy.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const renderPharmacyCard = ({ item }: { item: Store }) => (
    <Card
      onPress={() => navigation.navigate('Store', { storeId: item.slug, storeName: item.name })}
      style={{ marginBottom: spacing.md, marginHorizontal: spacing.lg }}
      padding={0}
    >
      <View style={{ flexDirection: 'row', padding: spacing.md }}>
        <Image
          source={{ uri: item.logo_url || undefined }}
          style={{
            width: 64,
            height: 64,
            borderRadius: borderRadius.md,
            backgroundColor: colors.primary[50],
          }}
          contentFit="cover"
        />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
            <Star size={12} color={colors.accent[500]} fill={colors.accent[500]} />
            <Text style={{ fontSize: 12, color: colors.text.secondary }}>
              {item.rating_average.toFixed(1)} ({item.rating_count})
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
            <Shield size={12} color="#059669" />
            <Text style={{ fontSize: 11, color: '#059669', fontWeight: '500' }}>
              {t('pharmacy.fdaLicensed')}
            </Text>
          </View>
          {item.minimum_order_value > 0 && (
            <Text style={{ fontSize: 11, color: colors.text.muted, marginTop: 2 }}>
              Min. {formatCurrency(item.minimum_order_value)}
            </Text>
          )}
        </View>
        <ChevronRight size={20} color={colors.text.muted} style={{ alignSelf: 'center' }} />
      </View>
    </Card>
  );

  const renderPrescriptionItem = ({ item }: { item: Prescription }) => {
    const statusConfig = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
    return (
      <Card style={{ marginBottom: spacing.md, marginHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: borderRadius.md,
              backgroundColor: colors.primary[50],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={24} color={colors.primary[500]} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: statusConfig.bgColor,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  gap: 4,
                }}
              >
                {statusConfig.icon}
                <Text style={{ fontSize: 11, color: statusConfig.color, fontWeight: '600' }}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
            {item.doctor_name && (
              <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 4 }}>
                Dr. {item.doctor_name}
              </Text>
            )}
            <Text style={{ fontSize: 11, color: colors.text.muted, marginTop: 2 }}>
              {t('pharmacy.uploadedOn')} {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Hero */}
      <View style={{ padding: spacing.lg, backgroundColor: colors.secondary[500] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pill size={24} color="#FFF" />
          <Text style={{ ...typography.h1, color: '#FFF' }}>{t('pharmacy.title')}</Text>
        </View>
        <Text style={{ ...typography.body, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
          {t('pharmacy.subtitle')}
        </Text>
      </View>

      {/* Tabs (only show prescriptions tab if authenticated) */}
      {isAuthenticated && (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {(['browse', 'prescriptions'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab ? colors.primary[500] : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: activeTab === tab ? '600' : '400',
                  color: activeTab === tab ? colors.primary[500] : colors.text.secondary,
                }}
              >
                {tab === 'browse' ? t('pharmacy.browseTab') : t('pharmacy.prescriptionsTab')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === 'browse' ? (
        <FlatList
          data={pharmacies}
          keyExtractor={(item) => item.id}
          renderItem={renderPharmacyCard}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            isAuthenticated ? (
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('prescriptions');
                  setShowUpload(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#eff6ff',
                  marginHorizontal: spacing.lg,
                  marginBottom: spacing.md,
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                  borderWidth: 1,
                  borderColor: '#bfdbfe',
                  gap: 12,
                }}
              >
                <Upload size={20} color="#2563eb" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1d4ed8' }}>
                    {t('pharmacy.uploadCta')}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
                    {t('pharmacy.uploadCtaDesc')}
                  </Text>
                </View>
                <ChevronRight size={16} color="#2563eb" />
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title={t('pharmacy.noPharmacies')}
              description={t('pharmacy.noPharmaciesDesc')}
            />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {/* Upload Section */}
          {showUpload ? (
            <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}>
              <Text style={{ ...typography.h3, marginBottom: spacing.md }}>
                {t('pharmacy.uploadPrescription')}
              </Text>

              {/* Image Picker */}
              {uploadImage ? (
                <View style={{ marginBottom: spacing.md }}>
                  <Image
                    source={{ uri: uploadImage }}
                    style={{
                      width: '100%',
                      height: 200,
                      borderRadius: borderRadius.md,
                    }}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setUploadImage(null)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: 12,
                      padding: 4,
                    }}
                  >
                    <XCircle size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
                  <TouchableOpacity
                    onPress={pickImage}
                    style={{
                      flex: 1,
                      height: 100,
                      borderWidth: 2,
                      borderColor: colors.border,
                      borderStyle: 'dashed',
                      borderRadius: borderRadius.lg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Upload size={24} color={colors.primary[500]} />
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>{t('pharmacy.gallery')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={takePhoto}
                    style={{
                      flex: 1,
                      height: 100,
                      borderWidth: 2,
                      borderColor: colors.border,
                      borderStyle: 'dashed',
                      borderRadius: borderRadius.lg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Camera size={24} color={colors.primary[500]} />
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>{t('pharmacy.camera')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Form Fields */}
              <View style={{ gap: spacing.md }}>
                <View>
                  <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 4 }}>
                    {t('pharmacy.doctorName')}
                  </Text>
                  <TextInput
                    value={doctorName}
                    onChangeText={setDoctorName}
                    placeholder={t('pharmacy.doctorNamePlaceholder')}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: 12,
                      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                      fontSize: 14,
                      color: colors.text.primary,
                    }}
                    placeholderTextColor={colors.text.muted}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 4 }}>
                    {t('pharmacy.doctorLicense')}
                  </Text>
                  <TextInput
                    value={doctorLicense}
                    onChangeText={setDoctorLicense}
                    placeholder={t('pharmacy.doctorLicensePlaceholder')}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: 12,
                      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                      fontSize: 14,
                      color: colors.text.primary,
                    }}
                    placeholderTextColor={colors.text.muted}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 4 }}>
                    {t('pharmacy.prescriptionDate')}
                  </Text>
                  <TextInput
                    value={prescriptionDate}
                    onChangeText={setPrescriptionDate}
                    placeholder="YYYY-MM-DD"
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: 12,
                      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                      fontSize: 14,
                      color: colors.text.primary,
                    }}
                    placeholderTextColor={colors.text.muted}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
                <Button
                  title={t('common.cancel')}
                  variant="outline"
                  onPress={() => {
                    setShowUpload(false);
                    setUploadImage(null);
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title={t('pharmacy.submit')}
                  onPress={handleUpload}
                  loading={isUploading}
                  disabled={!uploadImage}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ) : (
            <TouchableOpacity
              onPress={() => setShowUpload(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary[50],
                marginHorizontal: spacing.lg,
                marginBottom: spacing.md,
                padding: spacing.md,
                borderRadius: borderRadius.lg,
                gap: 12,
              }}
            >
              <Upload size={20} color={colors.primary[500]} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary[600] }}>
                {t('pharmacy.uploadPrescription')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Prescriptions List */}
          <Text
            style={{
              ...typography.h3,
              marginHorizontal: spacing.lg,
              marginBottom: spacing.sm,
            }}
          >
            {t('pharmacy.myPrescriptions')}
          </Text>

          {prescriptions.length === 0 ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <FileText size={48} color={colors.text.muted} />
              <Text style={{ ...typography.body, color: colors.text.muted, marginTop: spacing.md, textAlign: 'center' }}>
                {t('pharmacy.noPrescriptions')}
              </Text>
            </View>
          ) : (
            prescriptions.map((rx) => (
              <View key={rx.id}>{renderPrescriptionItem({ item: rx })}</View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
