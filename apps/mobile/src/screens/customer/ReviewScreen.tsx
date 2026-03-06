import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Send } from 'lucide-react-native';
import { Button, Card, InteractiveStarRating } from '../../components/shared';
import { catalogApi } from '../../services/api';
import { colors } from '../../theme';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { CreateReviewPayload } from '../../types';

type Route = RouteProp<CustomerStackParamList, 'Review'>;

const RATING_LABELS = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];

export function ReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { reviewableType, reviewableId, reviewableName, orderId } = route.params;

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = rating > 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateReviewPayload = {
        reviewable_type: reviewableType,
        reviewable_id: reviewableId,
        rating,
        ...(title.trim() && { title: title.trim() }),
        ...(body.trim() && { body: body.trim() }),
        ...(orderId && { order_id: orderId }),
      };

      await catalogApi.post('/catalog/reviews', payload);
      Alert.alert('Thank You!', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {/* Header */}
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.reviewFor}>Rate your experience with</Text>
            <Text style={styles.reviewableName}>{reviewableName}</Text>
          </Card>

          {/* Star Rating */}
          <Card style={{ marginBottom: 16, alignItems: 'center' }}>
            <Text style={styles.ratingPrompt}>How would you rate it?</Text>
            <InteractiveStarRating
              rating={rating}
              onRatingChange={setRating}
              size={40}
            />
            {rating > 0 && (
              <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
            )}
          </Card>

          {/* Title Input */}
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.inputLabel}>Title (optional)</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Summarize your experience"
              placeholderTextColor={colors.text.muted}
              maxLength={100}
            />
          </Card>

          {/* Body Input */}
          <Card style={{ marginBottom: 24 }}>
            <Text style={styles.inputLabel}>Your Review (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={body}
              onChangeText={setBody}
              placeholder="Tell others about your experience..."
              placeholderTextColor={colors.text.muted}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{body.length}/1000</Text>
          </Card>

          {/* Submit */}
          <Button
            title="Submit Review"
            icon={<Send size={18} color="#FFFFFF" />}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  reviewFor: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  reviewableName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  ratingPrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[500],
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'right',
    marginTop: 4,
  },
});
