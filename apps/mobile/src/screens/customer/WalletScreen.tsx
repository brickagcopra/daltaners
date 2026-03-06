import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react-native';
import { Card, Button, LoadingSpinner } from '../../components/shared';
import { paymentApi } from '../../services/api';
import { colors } from '../../theme';
import { formatCurrency, formatDateTime, t } from '../../utils';
import type { Wallet, WalletTransaction } from '../../types';

const TOPUP_AMOUNTS = [100, 500, 1000, 5000];

export function WalletScreen() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTopping, setIsTopping] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        paymentApi.get('/payments/wallet'),
        paymentApi.get('/payments/wallet/transactions', { params: { limit: 20 } }),
      ]);
      setWallet(walletRes.data.data);
      setTransactions(txRes.data.data ?? []);
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopUp = async (amount: number) => {
    setIsTopping(true);
    try {
      await paymentApi.post('/payments/wallet/topup', { amount });
      await loadWallet();
      Alert.alert('Top Up Successful', `${formatCurrency(amount)} has been added to your wallet.`);
    } catch {
      Alert.alert('Error', 'Failed to top up. Please try again.');
    } finally {
      setIsTopping(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  const txnIcon = (type: string) => {
    switch (type) {
      case 'topup': return <ArrowUpCircle size={20} color={colors.success} />;
      case 'refund': return <RefreshCw size={20} color={colors.primary[500]} />;
      default: return <ArrowDownCircle size={20} color={colors.error} />;
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Balance Card */}
      <View
        style={{
          margin: 16,
          padding: 24,
          borderRadius: 16,
          backgroundColor: colors.primary[500],
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{t('wallet.balance')}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '800', marginTop: 4 }}>
          {formatCurrency(wallet?.balance ?? 0)}
        </Text>
      </View>

      {/* Top Up */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
          {t('wallet.topUp')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TOPUP_AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              onPress={() => handleTopUp(amount)}
              disabled={isTopping}
              style={{
                width: '48%',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary[500] }}>
                {formatCurrency(amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transaction History */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
          {t('wallet.transactions')}
        </Text>
        {transactions.length === 0 ? (
          <Text style={{ color: colors.text.muted, textAlign: 'center', padding: 24 }}>
            {t('wallet.noTransactions')}
          </Text>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {txnIcon(tx.type)}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, textTransform: 'capitalize' }}>
                    {tx.type}
                  </Text>
                  {tx.description && (
                    <Text style={{ fontSize: 12, color: colors.text.muted }}>{tx.description}</Text>
                  )}
                  <Text style={{ fontSize: 11, color: colors.text.muted, marginTop: 2 }}>
                    {formatDateTime(tx.created_at)}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: tx.type === 'payment' ? colors.error : colors.success,
                  }}
                >
                  {tx.type === 'payment' ? '-' : '+'}{formatCurrency(tx.amount)}
                </Text>
              </View>
            </Card>
          ))
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
