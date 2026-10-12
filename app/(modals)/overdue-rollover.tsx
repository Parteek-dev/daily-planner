/**
 * Overdue Rollover modal — stub.
 * Full implementation in Task 32.7 (Phase 4 — UI Components).
 *
 * Presentation: 'modal' (see (modals)/_layout.tsx)
 * Requirements: 4.6
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/useTheme';

export default function OverdueRolloverModal() {
  const { tokens } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgSecondary }]}>
      <Text style={[styles.title, { color: tokens.textPrimary }]}>
        Overdue Tasks
      </Text>
      <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
        Full implementation coming in Phase 4.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
