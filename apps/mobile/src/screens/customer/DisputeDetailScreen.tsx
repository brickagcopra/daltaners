import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, Image, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle, Send, Clock, CheckCircle, ArrowUpCircle,
  User, Shield, Store, MessageSquare,
} from 'lucide-react-native';
import { Card, Badge, Button, LoadingSpinner } from '../../components/shared';
import { orderApi } from '../../services/api';
import { colors } from '../../theme';
import { formatDateTime, getTimeAgo } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Dispute, DisputeMessage, DisputeStatus } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type Route = RouteProp<CustomerStackParamList, 'DisputeDetail'>;

const STATUS_COLORS: Record<DisputeStatus, { bg: string; text: string }> = {
  open: { bg: '#FEF3C7', text: '#92400E' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
  pending_vendor: { bg: '#E0E7FF', text: '#3730A3' },
  pending_customer: { bg: '#FFF3ED', text: '#C24018' },
  escalated: { bg: '#FEE2E2', text: '#991B1B' },
  resolved: { bg: '#D1FAE5', text: '#065F46' },
};

const CATEGORY_LABELS: Record<string, string> = {
  order_not_received: 'Order Not Received',
  item_missing: 'Item Missing',
  wrong_item: 'Wrong Item',
  damaged_item: 'Damaged Item',
  quality_issue: 'Quality Issue',
  overcharged: 'Overcharged',
  late_delivery: 'Late Delivery',
  vendor_behavior: 'Vendor Behavior',
  delivery_behavior: 'Delivery Behavior',
  unauthorized_charge: 'Unauthorized Charge',
  other: 'Other',
};

const RESOLUTION_LABELS: Record<string, string> = {
  refund: 'Full Refund',
  partial_refund: 'Partial Refund',
  replacement: 'Replacement',
  store_credit: 'Store Credit',
  apology: 'Apology',
  other: 'Other',
};

const SENDER_ICON: Record<string, React.ReactNode> = {
  customer: <User size={16} color={colors.primary[500]} />,
  vendor: <Store size={16} color={colors.secondary[500]} />,
  admin: <Shield size={16} color={colors.warning} />,
  system: <AlertTriangle size={16} color={colors.text.muted} />,
};

export function DisputeDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { disputeId } = route.params;
  const scrollRef = useRef<ScrollView>(null);

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

  useEffect(() => {
    loadDispute();
  }, [disputeId]);

  const loadDispute = async () => {
    try {
      const { data } = await orderApi.get(`/disputes/${disputeId}`);
      setDispute(data.data ?? data);
    } catch {
      Alert.alert('Error', 'Failed to load dispute details.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await orderApi.post(`/disputes/${disputeId}/messages`, { message: trimmed });
      setMessageText('');
      await loadDispute();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    } catch {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleEscalate = () => {
    Alert.alert(
      'Escalate Dispute',
      'This will escalate the dispute to an admin for review. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate',
          style: 'destructive',
          onPress: async () => {
            setIsEscalating(true);
            try {
              await orderApi.post(`/disputes/${disputeId}/escalate`);
              await loadDispute();
              Alert.alert('Escalated', 'Your dispute has been escalated to an admin.');
            } catch {
              Alert.alert('Error', 'Failed to escalate dispute.');
            } finally {
              setIsEscalating(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading || !dispute) return <LoadingSpinner fullScreen />;

  const statusColor = STATUS_COLORS[dispute.status] ?? STATUS_COLORS.open;
  const isResolved = dispute.status === 'resolved';
  const canEscalate = ['open', 'in_progress', 'pending_vendor'].includes(dispute.status);
  const canMessage = !isResolved;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: canMessage ? 80 : 24 }}
        >
          {/* Dispute Header */}
          <Card style={styles.section}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.disputeNumber}>#{dispute.dispute_number}</Text>
                <Text style={styles.subject}>{dispute.subject}</Text>
              </View>
              <Badge
                label={dispute.status.replace(/_/g, ' ')}
                backgroundColor={statusColor.bg}
                color={statusColor.text}
              />
            </View>

            <View style={styles.infoGrid}>
              <InfoRow label="Category" value={CATEGORY_LABELS[dispute.category] ?? dispute.category} />
              <InfoRow label="Priority" value={dispute.priority} />
              {dispute.order_number && <InfoRow label="Order" value={`#${dispute.order_number}`} />}
              {dispute.store_name && <InfoRow label="Store" value={dispute.store_name} />}
              <InfoRow label="Filed" value={formatDateTime(dispute.created_at)} />
              {dispute.vendor_response_deadline && (
                <InfoRow label="Vendor Deadline" value={formatDateTime(dispute.vendor_response_deadline)} />
              )}
              {dispute.requested_resolution && (
                <InfoRow label="Requested" value={RESOLUTION_LABELS[dispute.requested_resolution] ?? dispute.requested_resolution} />
              )}
            </View>
          </Card>

          {/* Description */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{dispute.description}</Text>
          </Card>

          {/* Evidence Images */}
          {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Evidence ({dispute.evidence_urls.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {dispute.evidence_urls.map((url, i) => (
                  <Image
                    key={i}
                    source={{ uri: url }}
                    style={styles.evidenceImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </Card>
          )}

          {/* Resolution (if resolved) */}
          {isResolved && dispute.resolution_type && (
            <Card style={[styles.section, { backgroundColor: '#F0FDF4' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircle size={20} color="#065F46" />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#065F46' }}>Resolved</Text>
              </View>
              <InfoRow label="Resolution" value={RESOLUTION_LABELS[dispute.resolution_type] ?? dispute.resolution_type} />
              {dispute.resolution_amount != null && dispute.resolution_amount > 0 && (
                <InfoRow label="Amount" value={`₱${dispute.resolution_amount.toFixed(2)}`} />
              )}
              {dispute.resolved_at && <InfoRow label="Resolved On" value={formatDateTime(dispute.resolved_at)} />}
            </Card>
          )}

          {/* Escalate Button */}
          {canEscalate && (
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <Button
                title="Escalate to Admin"
                variant="outline"
                icon={<ArrowUpCircle size={18} color={colors.error} />}
                onPress={handleEscalate}
                loading={isEscalating}
                fullWidth
              />
            </View>
          )}

          {/* Messages */}
          <Card style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MessageSquare size={18} color={colors.text.primary} />
              <Text style={styles.sectionTitle}>Messages ({dispute.messages?.length ?? 0})</Text>
            </View>

            {(!dispute.messages || dispute.messages.length === 0) ? (
              <Text style={styles.emptyMessages}>No messages yet. Start the conversation below.</Text>
            ) : (
              dispute.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isOwn={msg.sender_type === 'customer'} />
              ))
            )}
          </Card>
        </ScrollView>

        {/* Message Input */}
        {canMessage && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.text.muted}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={5000}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!messageText.trim() || isSending}
              style={[styles.sendButton, (!messageText.trim() || isSending) && { opacity: 0.4 }]}
            >
              <Send size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MessageBubble({ message, isOwn }: { message: DisputeMessage; isOwn: boolean }) {
  return (
    <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {SENDER_ICON[message.sender_type] ?? SENDER_ICON.system}
        <Text style={[styles.senderName, isOwn && { color: colors.primary[700] }]}>
          {message.sender_name ?? message.sender_type}
        </Text>
        <Text style={styles.messageTime}>{getTimeAgo(message.created_at)}</Text>
      </View>
      <Text style={styles.messageText}>{message.message}</Text>
      {message.attachments && message.attachments.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {message.attachments.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.attachmentThumb} resizeMode="cover" />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  disputeNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
  },
  subject: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 0,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  infoGrid: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  evidenceImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: colors.border,
  },
  emptyMessages: {
    fontSize: 13,
    color: colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '90%',
  },
  ownBubble: {
    backgroundColor: colors.primary[50],
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  messageTime: {
    fontSize: 11,
    color: colors.text.muted,
  },
  messageText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  attachmentThumb: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 6,
    backgroundColor: colors.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
