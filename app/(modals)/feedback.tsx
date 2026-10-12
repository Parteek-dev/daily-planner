/**
 * Feedback modal — matches legacy FeedbackPage.jsx layout.
 *
 * Features:
 *  - Type selector (Bug / Feature / General)
 *  - Star rating (optional)
 *  - Message textarea (required)
 *  - Name + Email (optional, pre-filled from auth)
 *  - Stores to Firestore `feedback` collection
 *  - Success state
 *
 * Requirements: 4.6
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  Star,
  Send,
  CheckCircle2,
  AlertCircle,
  Bug,
  Lightbulb,
  MessageCircle,
  ClipboardList,
} from 'lucide-react-native'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/src/lib/firebase'
import { useAuth } from '@/src/hooks/useAuth'
import { useTheme } from '@/src/hooks/useTheme'

// ── Feedback types ─────────────────────────────────────────────────────────────

const TYPES = [
  { value: 'bug', label: 'Bug report', desc: 'Something is broken or not working', Icon: Bug, color: '#ef4444' },
  { value: 'feature', label: 'Feature request', desc: 'I want something new or improved', Icon: Lightbulb, color: '#f59e0b' },
  { value: 'general', label: 'General feedback', desc: 'Thoughts, suggestions, or praise', Icon: MessageCircle, color: '#6366f1' },
]

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedbackModal() {
  const { tokens } = useTheme()
  const router = useRouter()
  const { user } = useAuth()

  const prefillName = (user as any)?.displayName ?? ''
  const prefillEmail = (!user?.isAnonymous && user?.email) ? user.email : ''

  const [name, setName] = useState(prefillName)
  const [email, setEmail] = useState(prefillEmail)
  const [type, setType] = useState('general')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverStar, setHoverStar] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const styles = makeStyles(tokens)

  const handleClose = useCallback(() => {
    if (router.canDismiss?.()) {
      router.dismiss()
    } else if (router.canGoBack?.()) {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }, [router])

  const handleSubmit = async () => {
    if (!message.trim()) { setError('Please enter a message.'); return }
    setLoading(true)
    setError('')
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user?.uid ?? null,
        name: name.trim() || null,
        email: email.trim() || null,
        type,
        message: message.trim(),
        rating: rating || null,
        createdAt: serverTimestamp(),
      })
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgPrimary }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header — breadcrumb style matching settings */}
      <View style={[styles.header, { borderBottomColor: tokens.borderPrimary }]}>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: tokens.bgSecondary },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close feedback"
        >
          <ChevronLeft size={18} color={tokens.textSecondary} />
        </Pressable>
        <View style={styles.breadcrumbRow}>
          <Text style={[styles.breadcrumbCurrent, { color: tokens.textPrimary }]}>Feedback</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card */}
        <View style={[styles.card, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>

          {submitted ? (
            /* ── Success state ── */
            <View style={styles.successWrap}>
              <View style={[styles.successIcon, { backgroundColor: `${tokens.accentGreen}18`, borderColor: `${tokens.accentGreen}40` }]}>
                <CheckCircle2 size={28} color={tokens.accentGreen} />
              </View>
              <Text style={[styles.successTitle, { color: tokens.textPrimary }]}>Thank you! 🎉</Text>
              <Text style={[styles.successSub, { color: tokens.textSecondary }]}>
                Your feedback has been received. We really appreciate you taking the time to share your thoughts.
              </Text>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [styles.submitBtn, { backgroundColor: tokens.accentBlue, opacity: pressed ? 0.8 : 1, alignSelf: 'center', minWidth: 200, maxWidth: 320 }]}
                accessibilityRole="button"
              >
                <Text style={styles.submitBtnText}>Back to Daily Planner</Text>
              </Pressable>
            </View>

          ) : (
            <>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <ClipboardList size={22} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.cardHeaderTitle, { color: tokens.textPrimary }]}>Share your feedback</Text>
                  <Text style={[styles.cardHeaderSub, { color: tokens.textSecondary }]}>Help us make Daily Planner better</Text>
                </View>
              </View>

              {/* Error */}
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: `${tokens.accentRed}18`, borderColor: `${tokens.accentRed}40` }]}>
                  <AlertCircle size={14} color={tokens.accentRed} />
                  <Text style={[styles.errorText, { color: tokens.accentRed }]}>{error}</Text>
                </View>
              ) : null}

              {/* Type selector */}
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>TYPE</Text>
                {TYPES.map(t => {
                  const active = type === t.value
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setType(t.value)}
                      style={[
                        styles.typeBtn,
                        {
                          borderColor: active ? tokens.accentBlue : tokens.borderPrimary,
                          backgroundColor: active ? `${tokens.accentBlue}12` : tokens.bgInput,
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                    >
                      <View style={styles.typeBtnLeft}>
                        <t.Icon size={15} color={active ? t.color : tokens.textMuted} />
                        <Text style={[styles.typeBtnLabel, {
                          color: active ? tokens.accentBlue : tokens.textPrimary,
                          fontWeight: active ? '600' : '400',
                        }]}>{t.label}</Text>
                      </View>
                      <Text style={[styles.typeBtnDesc, { color: tokens.textMuted }]} numberOfLines={1}>{t.desc}</Text>
                    </Pressable>
                  )
                })}
              </View>

              {/* Star rating */}
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>
                  RATING <Text style={{ fontWeight: '400', textTransform: 'none' }}>(optional)</Text>
                </Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Pressable
                      key={n}
                      onPress={() => setRating(r => r === n ? 0 : n)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${n} star`}
                    >
                      <Star
                        size={28}
                        fill={rating >= n ? '#eab308' : 'transparent'}
                        color={rating >= n ? '#eab308' : tokens.borderPrimary}
                        strokeWidth={1.5}
                      />
                    </Pressable>
                  ))}
                  {rating > 0 && (
                    <Text style={[styles.ratingLabel, { color: tokens.textMuted }]}>{RATING_LABELS[rating]}</Text>
                  )}
                </View>
              </View>

              {/* Message */}
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>
                  MESSAGE <Text style={{ color: tokens.accentBlue }}>*</Text>
                </Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Tell us what's on your mind..."
                  placeholderTextColor={tokens.textMuted}
                  multiline
                  numberOfLines={5}
                  style={[styles.textarea, {
                    color: tokens.textPrimary,
                    backgroundColor: tokens.bgInput,
                    borderColor: tokens.borderPrimary,
                    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
                  }]}
                  accessibilityLabel="Message"
                />
              </View>

              {/* Name + Email */}
              <View style={styles.nameEmailRow}>
                <View style={styles.nameEmailCell}>
                  <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>NAME <Text style={{ fontWeight: '400' }}>(optional)</Text></Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={tokens.textMuted}
                    style={[styles.input, {
                      color: tokens.textPrimary,
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderPrimary,
                      ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
                    }]}
                    accessibilityLabel="Name"
                  />
                </View>
                <View style={styles.nameEmailCell}>
                  <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>EMAIL <Text style={{ fontWeight: '400' }}>(optional)</Text></Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={tokens.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[styles.input, {
                      color: tokens.textPrimary,
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderPrimary,
                      ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
                    }]}
                    accessibilityLabel="Email"
                  />
                </View>
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: tokens.accentBlue, opacity: (loading || pressed) ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send feedback"
              >
                <Send size={16} color="#fff" />
                <Text style={styles.submitBtnText}>{loading ? 'Submitting…' : 'Send Feedback'}</Text>
              </Pressable>

              <Text style={[styles.footerNote, { color: tokens.textMuted }]}>
                Your feedback is stored securely and helps improve the app.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    safe: { flex: 1 },
    // Header — matches settings page
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 8,
    },
    backBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        web: { cursor: 'pointer', outlineStyle: 'none' } as any,
      }),
    },
    breadcrumbRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    breadcrumbCurrent: {
      fontSize: 15,
      fontWeight: '600',
    },
    // Content
    scroll: {
      padding: 16,
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 24,
      marginBottom: 32,
    },
    // Card Header
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
    cardHeaderIcon: {
      width: 46, height: 46, borderRadius: 14,
      backgroundColor: tokens.accentBlue,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    cardHeaderTitle: { fontSize: 18, fontWeight: '700', marginBottom: 3 },
    cardHeaderSub: { fontSize: 13 },
    // Error
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
    errorText: { fontSize: 13, flex: 1 },
    // Fields
    field: { marginBottom: 18 },
    fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
    // Type buttons
    typeBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 6,
    },
    typeBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typeBtnLabel: { fontSize: 14 },
    typeBtnDesc: { fontSize: 12, maxWidth: '50%', textAlign: 'right' },
    // Stars
    starsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ratingLabel: { fontSize: 12, marginLeft: 4 },
    // Inputs
    textarea: {
      borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, minHeight: 110, textAlignVertical: 'top',
    },
    input: {
      borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 14,
    },
    nameEmailRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    nameEmailCell: { flex: 1 },
    // Submit
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 13, paddingHorizontal: 24, borderRadius: 12,
      alignSelf: 'stretch',
    },
    submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    footerNote: { fontSize: 11, textAlign: 'center', marginTop: 10 },
    // Success
    successWrap: { alignItems: 'center', paddingVertical: 20 },
    successIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    successTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
    successSub: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 28, paddingHorizontal: 8 },
  })
}
