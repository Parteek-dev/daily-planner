/**
 * SearchFilter.tsx — search bar with topic and status filter panel.
 *
 * Migrated from frontend/src/components/SearchFilter.jsx.
 * All HTML elements replaced with RN primitives; all CSS replaced with
 * StyleSheet.create() using theme tokens. Browser-specific DOM APIs removed.
 *
 * Requirements: 8.1
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { Search, Filter, X, ChevronDown } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'

// ── Types ─────────────────────────────────────────────────────────────────────

export type StatusFilter = 'all' | 'completed' | 'pending'

export interface SearchFilterTopic {
  name: string
  color: string
}

export interface SearchFilterProps {
  value: string
  onChange: (text: string) => void
  topics?: SearchFilterTopic[]
  selectedTopic?: string
  onTopicChange?: (topic: string) => void
  statusFilter?: StatusFilter
  onStatusChange?: (status: StatusFilter) => void
  placeholder?: string
  showFilters?: boolean
}

// ── Filter helper (exported for use alongside the component) ─────────────────

export interface FilterOptions {
  searchQuery?: string
  topicFilter?: string
  statusFilter?: StatusFilter
}

export function filterTasks<T extends { title: string; description?: string; topic: string; completed: boolean }>(
  tasks: T[],
  { searchQuery, topicFilter, statusFilter }: FilterOptions,
): T[] {
  return tasks.filter(task => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        task.title.toLowerCase().includes(q) ||
        (task.description ?? '').toLowerCase().includes(q) ||
        task.topic.toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    if (topicFilter && task.topic !== topicFilter) return false
    if (statusFilter === 'completed' && !task.completed) return false
    if (statusFilter === 'pending' && task.completed) return false
    return true
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchFilter({
  value,
  onChange,
  topics = [],
  selectedTopic,
  onTopicChange,
  statusFilter = 'all',
  onStatusChange,
  placeholder = 'Search tasks...',
  showFilters = true,
}: SearchFilterProps) {
  const { tokens } = useTheme()
  const styles = makeStyles(tokens)

  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const hasActiveFilters = !!selectedTopic || statusFilter !== 'all'

  const clearFilters = () => {
    onChange('')
    onTopicChange?.('')
    onStatusChange?.('all')
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={[styles.inputWrapper, { backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary }]}>
          <Search size={16} color={tokens.textMuted} />
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={tokens.textMuted}
            style={[styles.textInput, { color: tokens.textPrimary }]}
            accessible
            accessibilityLabel="Search tasks"
          />
          {!!value && (
            <Pressable onPress={() => onChange('')} accessibilityLabel="Clear search">
              <X size={14} color={tokens.textMuted} />
            </Pressable>
          )}
        </View>

        {showFilters && (
          <Pressable
            onPress={() => setShowFilterPanel(prev => !prev)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: hasActiveFilters ? tokens.accentBlue : tokens.bgInput,
                borderColor: hasActiveFilters ? tokens.accentBlue : tokens.borderPrimary,
              },
            ]}
            accessibilityLabel="Toggle filters"
            accessibilityRole="button"
          >
            <Filter size={16} color={hasActiveFilters ? '#fff' : tokens.textSecondary} />
            <ChevronDown
              size={14}
              color={hasActiveFilters ? '#fff' : tokens.textSecondary}
              style={{ transform: [{ rotate: showFilterPanel ? '180deg' : '0deg' }] }}
            />
            {hasActiveFilters && <View style={[styles.activeDot, { backgroundColor: tokens.accentOrange }]} />}
          </Pressable>
        )}
      </View>

      {/* Filter panel */}
      {showFilters && showFilterPanel && (
        <View style={[styles.filterPanel, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
          <View style={styles.filterPanelHeader}>
            <Text style={[styles.filterPanelTitle, { color: tokens.textSecondary }]}>Filters</Text>
            {hasActiveFilters && (
              <Pressable onPress={clearFilters} style={styles.clearBtn}>
                <Text style={{ fontSize: 12, color: tokens.accentBlue }}>Clear all</Text>
              </Pressable>
            )}
          </View>

          {/* Status filter */}
          <View style={{ marginBottom: 14 }}>
            <Text style={[styles.filterLabel, { color: tokens.textMuted }]}>Status</Text>
            <View style={styles.statusRow}>
              {(['all', 'pending', 'completed'] as StatusFilter[]).map(opt => (
                <Pressable
                  key={opt}
                  onPress={() => onStatusChange?.(opt)}
                  style={[
                    styles.statusBtn,
                    {
                      backgroundColor: statusFilter === opt ? tokens.accentBlue : tokens.bgInput,
                      borderColor: statusFilter === opt ? tokens.accentBlue : tokens.borderPrimary,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: statusFilter === opt }}
                >
                  <Text style={{ fontSize: 12, color: statusFilter === opt ? '#fff' : tokens.textSecondary, textTransform: 'capitalize' }}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Topic filter */}
          {topics.length > 0 && (
            <View>
              <Text style={[styles.filterLabel, { color: tokens.textMuted }]}>Topic</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.topicRow}>
                  <Pressable
                    onPress={() => onTopicChange?.('')}
                    style={[
                      styles.topicChip,
                      {
                        backgroundColor: !selectedTopic ? tokens.accentBlue : tokens.bgInput,
                        borderColor: !selectedTopic ? tokens.accentBlue : tokens.borderPrimary,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 12, color: !selectedTopic ? '#fff' : tokens.textSecondary }}>All</Text>
                  </Pressable>
                  {topics.map(t => (
                    <Pressable
                      key={t.name}
                      onPress={() => onTopicChange?.(t.name)}
                      style={[
                        styles.topicChip,
                        {
                          backgroundColor: selectedTopic === t.name ? `${t.color}20` : tokens.bgInput,
                          borderColor: selectedTopic === t.name ? t.color : tokens.borderPrimary,
                          borderWidth: selectedTopic === t.name ? 2 : 1,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 12, color: selectedTopic === t.name ? t.color : tokens.textSecondary, fontWeight: '500' }}>
                        {t.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

// ── Styles factory ────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    searchRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 0,
    },
    inputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    textInput: {
      flex: 1,
      fontSize: 14,
      paddingVertical: 0,
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      position: 'relative',
    },
    activeDot: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    filterPanel: {
      marginTop: 8,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
    },
    filterPanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    filterPanelTitle: {
      fontSize: 13,
      fontWeight: '600',
    },
    clearBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    filterLabel: {
      fontSize: 12,
      marginBottom: 8,
    },
    statusRow: {
      flexDirection: 'row',
      gap: 6,
    },
    statusBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    topicRow: {
      flexDirection: 'row',
      gap: 6,
    },
    topicChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
    },
  })
}
