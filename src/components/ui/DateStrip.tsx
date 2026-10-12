/**
 * DateStrip — horizontal date selector strip.
 *
 * Matches the reference design's calendar date picker with:
 * - Week view with day names
 * - Circular selected date indicator
 * - Month/year header with navigation
 *
 * Props:
 *   selectedDate  — currently selected date
 *   onSelectDate  — callback when date is selected
 *   style         — additional ViewStyle
 */

import React, { useMemo } from 'react'
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { applyElevation, type Tokens } from '@/src/theme/tokens'
import AppText from '../AppText'
import { PressableScale } from '../motion'

export interface DateStripProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onPrevWeek?: () => void
  onNextWeek?: () => void
  style?: StyleProp<ViewStyle>
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function DateStrip({
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  style,
}: DateStripProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)
  
  // Get the week dates starting from Monday
  const weekDates = useMemo(() => {
    const dates: Date[] = []
    const current = new Date(selectedDate)
    const dayOfWeek = current.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    
    const monday = new Date(current)
    monday.setDate(current.getDate() + mondayOffset)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      dates.push(date)
    }
    
    return dates
  }, [selectedDate])
  
  const monthYear = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }
  
  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }
  
  return (
    <View style={[styles.container, style]}>
      {/* Month/Year header */}
      <View style={styles.header}>
        <AppText role="subheading">{monthYear}</AppText>
        <View style={styles.navButtons}>
          <PressableScale onPress={onPrevWeek} style={styles.navButton}>
            <ChevronLeft size={20} color={tokens.textSecondary} />
          </PressableScale>
          <PressableScale onPress={onNextWeek} style={styles.navButton}>
            <ChevronRight size={20} color={tokens.textSecondary} />
          </PressableScale>
        </View>
      </View>
      
      {/* Week days */}
      <View style={styles.weekRow}>
        {weekDates.map((date, index) => {
          const selected = isSelected(date)
          const today = isToday(date)
          
          return (
            <PressableScale
              key={date.toISOString()}
              onPress={() => onSelectDate(date)}
              style={styles.dayColumn}
            >
              <AppText
                role="label"
                color={selected ? tokens.accentPrimary : tokens.textMuted}
              >
                {DAY_NAMES[index]}
              </AppText>
              <View
                style={[
                  styles.dayCircle,
                  selected && styles.dayCircleSelected,
                  today && !selected && styles.dayCircleToday,
                ]}
              >
                <AppText
                  role="body"
                  color={selected ? tokens.textInverse : tokens.textPrimary}
                  style={{ fontWeight: selected || today ? '700' : '500' }}
                >
                  {date.getDate()}
                </AppText>
              </View>
            </PressableScale>
          )
        })}
      </View>
    </View>
  )
}

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    container: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.lg,
      ...applyElevation(tokens.elevation.xs) as any,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.lg,
    },
    navButtons: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    navButton: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.sm,
      backgroundColor: tokens.bgTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayColumn: {
      alignItems: 'center',
      gap: tokens.spacing.sm,
      flex: 1,
    },
    dayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircleSelected: {
      backgroundColor: tokens.accentPrimary,
    },
    dayCircleToday: {
      borderWidth: 2,
      borderColor: tokens.accentPrimary,
    },
  })
}
