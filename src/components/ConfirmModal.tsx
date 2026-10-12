/**
 * Cross-platform confirmation modal that works on web and mobile.
 * - Web: Centered dialog box
 * - Mobile: Bottom sheet style
 */

import React from 'react'
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import type { Tokens } from '@/src/theme/tokens'

interface ConfirmModalProps {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  // If no cancel label, show single button (alert style)
  const showCancelButton = cancelLabel.length > 0
  const isWeb = Platform.OS === 'web'

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? 'fade' : 'slide'}
      onRequestClose={onCancel}
    >
      <Pressable
        style={[styles.overlay, isWeb && styles.overlayWeb]}
        onPress={showCancelButton ? onCancel : undefined}
      >
        <Pressable
          style={[
            styles.container,
            isWeb ? styles.containerWeb : styles.containerMobile
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag handle for mobile */}
          {!isWeb && <View style={styles.dragHandle} />}

          <Text style={[styles.title, isWeb && styles.titleWeb]}>{title}</Text>
          <Text style={[styles.message, isWeb && styles.messageWeb]}>{message}</Text>

          <View style={[styles.buttonRow, isWeb && styles.buttonRowWeb]}>
            {showCancelButton && (
              <Pressable
                onPress={onCancel}
                disabled={loading}
                style={({ pressed }) => [
                  styles.button,
                  styles.cancelButton,
                  isWeb && styles.buttonWeb,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </Pressable>
            )}

            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                destructive ? styles.destructiveButton : styles.confirmButton,
                isWeb && styles.buttonWeb,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
                !showCancelButton && styles.fullWidthButton,
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const makeStyles = (tokens: Tokens) =>
  StyleSheet.create({
    // Overlay styles
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    overlayWeb: {
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Container styles
    container: {
      backgroundColor: tokens.bgSecondary,
      padding: 24,
    },
    containerMobile: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: 34, // Safe area padding
    },
    containerWeb: {
      borderRadius: 12,
      width: '100%',
      maxWidth: 420,
      margin: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },

    // Drag handle (mobile only)
    dragHandle: {
      width: 36,
      height: 4,
      backgroundColor: tokens.borderPrimary,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },

    // Title and message
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginBottom: 8,
    },
    titleWeb: {
      fontSize: 17,
      textAlign: 'left',
    },
    message: {
      fontSize: 15,
      color: tokens.textSecondary,
      lineHeight: 22,
      marginBottom: 24,
    },
    messageWeb: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 20,
    },

    // Button row
    buttonRow: {
      flexDirection: 'column',
      gap: 10,
    },
    buttonRowWeb: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },

    // Buttons
    button: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
    },
    buttonWeb: {
      flex: 0,
      minHeight: 40,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    fullWidthButton: {
      flex: 1,
    },
    cancelButton: {
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
    },
    confirmButton: {
      backgroundColor: tokens.accentBlue,
    },
    destructiveButton: {
      backgroundColor: '#ef4444',
    },
    buttonPressed: {
      opacity: 0.8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    confirmText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
  })
