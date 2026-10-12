/**
 * PillTabs — horizontal pill-shaped tab selector.
 *
 * Matches the reference design's filter tabs with:
 * - Pill-shaped active indicator
 * - Smooth background color change
 * - Horizontal scrollable on overflow
 *
 * Props:
 *   tabs       — array of { id, label, count? }
 *   activeId   — currently selected tab id
 *   onChange   — callback when tab changes
 *   style      — additional ViewStyle
 */

import React from 'react'
import { View, ScrollView, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { type Tokens } from '@/src/theme/tokens'
import AppText from '../AppText'
import { PressableScale } from '../motion'

export interface Tab {
  id: string
  label: string
  count?: number
}

export interface PillTabsProps {
  tabs: Tab[]
  activeId: string
  onChange: (id: string) => void
  style?: StyleProp<ViewStyle>
  size?: 'sm' | 'md'
}

export default function PillTabs({
  tabs,
  activeId,
  onChange,
  style,
  size = 'md',
}: PillTabsProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens, size)
  
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        
        return (
          <PressableScale
            key={tab.id}
            onPress={() => onChange(tab.id)}
            scale={0.97}
          >
            <View
              style={[
                styles.tab,
                isActive && styles.tabActive,
              ]}
            >
              <AppText
                role={size === 'sm' ? 'caption' : 'body'}
                color={isActive ? tokens.textInverse : tokens.textSecondary}
                style={styles.tabText}
              >
                {tab.label}
              </AppText>
              {tab.count !== undefined && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <AppText
                    role="label"
                    color={isActive ? tokens.accentPrimary : tokens.textMuted}
                  >
                    {tab.count}
                  </AppText>
                </View>
              )}
            </View>
          </PressableScale>
        )
      })}
    </ScrollView>
  )
}

function makeStyles(tokens: Tokens, size: 'sm' | 'md') {
  const paddingV = size === 'sm' ? tokens.spacing.sm : tokens.spacing.md
  const paddingH = size === 'sm' ? tokens.spacing.md : tokens.spacing.lg
  
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: paddingV,
      paddingHorizontal: paddingH,
      borderRadius: tokens.radius.full,
      backgroundColor: tokens.bgTertiary,
      gap: tokens.spacing.sm,
    },
    tabActive: {
      backgroundColor: tokens.accentPrimary,
    },
    tabText: {
      fontWeight: '600',
    },
    countBadge: {
      backgroundColor: tokens.bgSecondary,
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: 2,
      borderRadius: tokens.radius.full,
    },
    countBadgeActive: {
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
  })
}
