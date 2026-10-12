/**
 * Settings modal — tabbed design matching the original web app.
 *
 * Web wide (≥ 600 px): left tab sidebar + right content area, max-width 700
 * Mobile: tab list as full-width rows (drill-down style)
 *
 * Tabs: Appearance · Notifications · Data · Archive · About
 * Plus: user profile card at top of sidebar, account actions at bottom
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  Share,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { useRouter } from 'expo-router'
import {
  X,
  Palette,
  Bell,
  Database,
  Archive as ArchiveIcon,
  Info,
  Download,
  Upload,
  Calendar,
  LogOut,
  UserMinus,
  UserPlus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Settings,
  Check,
  Sun,
  Moon,
  SunMoon,
  Sliders,
  Clock,
  RotateCcw,
  Search,
} from 'lucide-react-native'
import { PermissionStatus } from 'expo-modules-core'

import { useAuth } from '@/src/hooks/useAuth'
import { useProgress } from '@/src/hooks/useProgress'
import { useTheme, ACCENT_COLORS, type ThemeMode } from '@/src/hooks/useTheme'
import { useAccessibility, FONT_SIZES } from '@/src/hooks/useAccessibility'
import ConfirmModal from '@/src/components/ConfirmModal'

// ── Tab definitions ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'appearance', label: 'Appearance', Icon: Palette },
  { id: 'accessibility', label: 'Accessibility', Icon: Sliders },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'data', label: 'Data', Icon: Database },
  { id: 'archive', label: 'Archive', Icon: ArchiveIcon },
  { id: 'about', label: 'About', Icon: Info },
] as const

type TabId = typeof TABS[number]['id']

const WIDE_BREAKPOINT = 600

// ── Appearance tab ─────────────────────────────────────────────────────────────

function AppearanceTab({ tokens }: { tokens: ReturnType<typeof useTheme>['tokens'] }) {
  const { theme, themeMode, setThemeMode, accentColor, setAccentColor } = useTheme()
  const [hexInput, setHexInput] = useState(accentColor)

  const handleHex = (text: string) => {
    setHexInput(text)
    if (/^#[0-9A-Fa-f]{6}$/.test(text)) setAccentColor(text)
  }

  const modes: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', Icon: Sun },
    { id: 'dark', label: 'Dark', Icon: Moon },
    { id: 'auto', label: 'Auto', Icon: SunMoon },
  ]

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Theme Mode card */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <View style={ts.dataRow}>
          <View style={[ts.dataRowIcon, { backgroundColor: `${tokens.accentBlue}15` }]}>
            <Palette size={16} color={tokens.accentBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Theme Mode</Text>
            <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>Choose light, dark, or auto</Text>
          </View>
        </View>
        <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />
        <View style={ts.cardPadded}>
          <View style={ts.modeRow}>
            {modes.map(({ id, label, Icon }) => {
              const active = themeMode === id
              return (
                <Pressable
                  key={id}
                  onPress={() => setThemeMode(id)}
                  style={[
                    ts.modeCard,
                    { borderColor: active ? tokens.accentBlue : tokens.borderPrimary },
                    active && { backgroundColor: tokens.accentBlue },
                    !active && { backgroundColor: tokens.bgInput },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Icon size={22} color={active ? '#fff' : tokens.textSecondary} />
                  <Text style={[ts.modeLabel, { color: active ? '#fff' : tokens.textSecondary }]}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>

      {/* Accent Color card */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <View style={ts.dataRow}>
          <View style={[ts.dataRowIcon, { backgroundColor: `${accentColor}15` }]}>
            <View style={[ts.colorDot, { backgroundColor: accentColor }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Accent Color</Text>
            <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>Pick a color theme</Text>
          </View>
        </View>
        <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />
        <View style={ts.cardPadded}>
          <View style={ts.colorGrid}>
            {ACCENT_COLORS.map(c => {
              const active = accentColor === c.value
              return (
                <Pressable
                  key={c.value}
                  onPress={() => { setAccentColor(c.value); setHexInput(c.value) }}
                  style={[
                    ts.colorSwatch,
                    { backgroundColor: c.value },
                    active && ts.colorSwatchActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                  accessibilityState={{ selected: active }}
                >
                  {active && <Check size={18} color="#fff" strokeWidth={3} />}
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>

      {/* Custom Color card */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <View style={ts.dataRow}>
          <View style={[ts.dataRowIcon, { backgroundColor: `${tokens.accentPurple}15` }]}>
            <Sliders size={16} color={tokens.accentPurple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Custom Color</Text>
            <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>Enter a hex code</Text>
          </View>
        </View>
        <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />
        <View style={ts.cardPadded}>
          <View style={ts.hexRow}>
            <View style={[ts.hexPreview, { backgroundColor: accentColor }]} />
            <TextInput
              value={hexInput}
              onChangeText={handleHex}
              placeholder="#3b82f6"
              placeholderTextColor={tokens.textMuted}
              autoCapitalize="characters"
              maxLength={7}
              style={[
                ts.hexInput,
                {
                  color: tokens.textPrimary,
                  backgroundColor: tokens.bgInput,
                  borderColor: tokens.borderPrimary,
                },
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
              ]}
            />
          </View>

          {/* Preview */}
          <View style={[ts.preview, { backgroundColor: tokens.bgInput }]}>
            <Text style={[ts.appearancePreviewLabel, { color: tokens.textMuted }]}>Preview</Text>
            <View style={ts.previewRow}>
              <View style={[ts.previewPrimary, { backgroundColor: accentColor }]}>
                <Text style={ts.previewPrimaryText}>Primary</Text>
              </View>
              <View style={[ts.previewSecondary, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
                <Text style={[ts.previewSecondaryText, { color: tokens.textSecondary }]}>Secondary</Text>
              </View>
              <View style={[ts.previewBadge, { backgroundColor: accentColor }]}>
                <Text style={ts.previewBadgeText}>Badge</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

// ── Accessibility tab ──────────────────────────────────────────────────────────

function AccessibilityTab({ tokens }: { tokens: ReturnType<typeof useTheme>['tokens'] }) {
  const { reduceMotion, setReduceMotion, fontSize, setFontSize } = useAccessibility()

  const previewScale = FONT_SIZES.find(f => f.id === fontSize)?.scale ?? 1

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Reduce Animations card */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <Pressable
          onPress={() => setReduceMotion(!reduceMotion)}
          style={({ pressed }) => [
            ts.dataRow,
            pressed && { backgroundColor: tokens.bgInput },
          ]}
          accessibilityRole="switch"
          accessibilityLabel="Reduce animations"
          accessibilityState={{ checked: reduceMotion }}
        >
          <View style={[ts.dataRowIcon, { backgroundColor: `${tokens.accentOrange}15` }]}>
            <SunMoon size={16} color={tokens.accentOrange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Reduce Animations</Text>
            <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>
              Turn off slide-in, fade, and scale transitions
            </Text>
          </View>
          <View
            style={[
              ts.togglePill,
              reduceMotion
                ? { backgroundColor: tokens.accentBlue }
                : { backgroundColor: tokens.bgInput, borderWidth: 1, borderColor: tokens.borderPrimary },
            ]}
          >
            <Text style={[ts.togglePillText, { color: reduceMotion ? '#ffffff' : tokens.textSecondary }]}>
              {reduceMotion ? 'On' : 'Off'}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Task Title Size card */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <View style={ts.dataRow}>
          <View style={[ts.dataRowIcon, { backgroundColor: `${tokens.accentBlue}15` }]}>
            <Sliders size={16} color={tokens.accentBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Task Title Size</Text>
            <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>
              Adjust the size of task titles in lists
            </Text>
          </View>
        </View>
        <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />
        <View style={ts.cardPadded}>
          <View style={ts.fontSizeRow}>
            {FONT_SIZES.map(opt => {
              const active = fontSize === opt.id
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setFontSize(opt.id)}
                  style={({ pressed }) => [
                    ts.fontSizeBtn,
                    {
                      backgroundColor: active ? `${tokens.accentBlue}18` : tokens.bgInput,
                      borderColor: active ? tokens.accentBlue : tokens.borderPrimary,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt.label} text size`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[
                    ts.fontSizeBtnLabel,
                    {
                      fontSize: 14 * opt.scale,
                      color: active ? tokens.accentBlue : tokens.textSecondary,
                      fontWeight: active ? '700' : '400',
                    },
                  ]}>
                    Aa
                  </Text>
                  <Text style={[ts.fontSizeOptLabel, { color: active ? tokens.accentBlue : tokens.textMuted }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Preview */}
          <View style={[ts.previewBox, { backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary }]}>
            <Text style={[ts.previewLabel, { color: tokens.textMuted }]}>Preview</Text>
            <Text style={[ts.previewTask, { fontSize: 14 * previewScale, color: tokens.textPrimary }]}>
              Review project documentation
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

// ── Notifications tab ──────────────────────────────────────────────────────────

function NotificationsTab({ tokens }: { tokens: ReturnType<typeof useTheme>['tokens'] }) {
  const [enabled, setEnabled] = useState(false)
  const [permission, setPermission] = useState<string>(PermissionStatus.UNDETERMINED)
  const [reminderMins, setReminderMins] = useState(10)

  React.useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermission(status)
      setEnabled(status === 'granted')
    })
  }, [])

  const handleToggle = async () => {
    if (!enabled) {
      const { status } = await Notifications.requestPermissionsAsync()
      setPermission(status)
      setEnabled(status === 'granted')
    } else {
      setEnabled(false)
    }
  }

  const isBlocked = permission === 'denied' || permission === PermissionStatus.DENIED

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Task Reminders card */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <Pressable
          onPress={isBlocked ? undefined : handleToggle}
          disabled={isBlocked}
          style={({ pressed }) => [
            ts.dataRow,
            pressed && !isBlocked && { backgroundColor: tokens.bgInput },
          ]}
          accessibilityRole="switch"
          accessibilityLabel="Task reminders"
          accessibilityState={{ checked: enabled }}
        >
          <View style={[ts.dataRowIcon, { backgroundColor: `${tokens.accentBlue}15` }]}>
            {enabled ? (
              <Bell size={16} color={tokens.accentBlue} />
            ) : (
              <Bell size={16} color={tokens.textMuted} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Task Reminders</Text>
            <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>
              {isBlocked
                ? 'Notifications blocked — enable in device settings'
                : enabled
                  ? 'Get notified before tasks are due'
                  : 'Receive reminders for scheduled tasks'
              }
            </Text>
          </View>
          {isBlocked ? (
            <View style={[ts.togglePill, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#ef4444' }}>Blocked</Text>
            </View>
          ) : (
            <View
              style={[
                ts.togglePill,
                enabled
                  ? { backgroundColor: tokens.accentBlue }
                  : { backgroundColor: tokens.bgInput, borderWidth: 1, borderColor: tokens.borderPrimary },
              ]}
            >
              <Text style={[ts.togglePillText, { color: enabled ? '#ffffff' : tokens.textSecondary }]}>
                {enabled ? 'On' : 'Off'}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Reminder time selector — only when enabled */}
        {enabled && (
          <>
            <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />
            <View style={ts.dataRow}>
              <View style={[ts.dataRowIcon, { backgroundColor: `${tokens.accentOrange}15` }]}>
                <Clock size={16} color={tokens.accentOrange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Remind Before</Text>
                <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>
                  How early to notify you
                </Text>
              </View>
            </View>
            <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />
            <View style={ts.cardPadded}>
              <View style={ts.reminderChipsRow}>
                {[5, 10, 15, 30, 60].map(mins => {
                  const active = reminderMins === mins
                  const label = mins >= 60 ? `${mins / 60} hr` : `${mins} min`
                  return (
                    <Pressable
                      key={mins}
                      onPress={() => setReminderMins(mins)}
                      style={[
                        ts.reminderChip,
                        {
                          backgroundColor: active ? `${tokens.accentBlue}18` : tokens.bgInput,
                          borderColor: active ? tokens.accentBlue : tokens.borderPrimary,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontWeight: active ? '600' : '400',
                        color: active ? tokens.accentBlue : tokens.textSecondary,
                      }}>
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  )
}

// ── Data tab ───────────────────────────────────────────────────────────────────

function DataTab({
  tokens,
  exportData,
  exportAsIcs,
  importData,
  resetAllData,
}: {
  tokens: ReturnType<typeof useTheme>['tokens']
  exportData: () => string
  exportAsIcs: (...args: any[]) => Promise<any>
  importData: (json: string) => Promise<any>
  resetAllData: () => Promise<void>
}) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)

  const handleExportJson = async () => {
    try {
      setExporting(true)
      const json = exportData()
      const name = `planner-export-${new Date().toISOString().split('T')[0]}.json`
      if (Platform.OS === 'web') {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
        a.download = name; a.click()
      } else {
        const uri = `${FileSystem.cacheDirectory}${name}`
        await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 })
        await Share.share({ url: uri, title: name })
      }
    } catch { Alert.alert('Export failed', 'Could not export data.') }
    finally { setExporting(false) }
  }

  const handleExportIcs = async () => {
    try {
      setExporting(true)
      await exportAsIcs(null, null)
    } catch { Alert.alert('Export failed', 'Could not export calendar.') }
    finally { setExporting(false) }
  }

  const handleImport = async () => {
    try {
      setImporting(true)
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })
      if (result.canceled || !result.assets?.length) return
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 })
      const r = await importData(content)
      if (r.success) Alert.alert('Import successful', `Imported tasks and topics.`)
      else Alert.alert('Import failed', (r as any).error ?? 'Invalid file.')
    } catch { Alert.alert('Import failed', 'Could not read file.') }
    finally { setImporting(false) }
  }

  const handleResetClick = () => {
    setShowResetConfirm(true)
  }

  const handleResetConfirm = async () => {
    setResetting(true)
    try {
      console.log('[DataTab] Calling resetAllData...')
      await resetAllData()
      console.log('[DataTab] resetAllData completed')
      setShowResetConfirm(false)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('[DataTab] Reset failed:', error)
      setShowResetConfirm(false)
      setShowErrorModal(true)
    } finally {
      setResetting(false)
    }
  }

  const rows = [
    { label: 'Export as JSON', sub: 'Download all tasks, notes, topics', icon: <Download size={16} color={tokens.accentGreen} />, iconBg: `${tokens.accentGreen}15`, onPress: exporting ? undefined : handleExportJson, disabled: exporting },
    { label: 'Export as Calendar (.ics)', sub: 'Open in any calendar app', icon: <Calendar size={16} color={tokens.accentBlue} />, iconBg: `${tokens.accentBlue}15`, onPress: exporting ? undefined : handleExportIcs, disabled: exporting },
    { label: 'Import from JSON', sub: 'Replace data with a backup file', icon: <Upload size={16} color={tokens.accentOrange} />, iconBg: `${tokens.accentOrange}15`, onPress: importing ? undefined : handleImport, disabled: importing },
  ]

  return (
    <>
      {/* Export/Import card */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        {rows.map((row, index) => (
          <React.Fragment key={row.label}>
            {index > 0 && <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />}
            <Pressable
              onPress={row.onPress}
              disabled={row.disabled}
              style={({ pressed }) => [
                ts.dataRow,
                { opacity: row.disabled ? 0.5 : 1 },
                pressed && { backgroundColor: tokens.bgInput },
              ]}
              accessibilityRole="button"
            >
              <View style={[ts.dataRowIcon, { backgroundColor: row.iconBg }]}>
                {row.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>{row.label}</Text>
                <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>{row.sub}</Text>
              </View>
              <ChevronRight size={16} color={tokens.textMuted} />
            </Pressable>
          </React.Fragment>
        ))}
      </View>

      {/* Reset card — separate for destructive action */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <Pressable
          onPress={resetting ? undefined : handleResetClick}
          disabled={resetting}
          style={({ pressed }) => [
            ts.dataRow,
            { opacity: resetting ? 0.5 : 1 },
            pressed && { backgroundColor: tokens.bgInput },
          ]}
          accessibilityRole="button"
        >
          <View style={[ts.dataRowIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
            {resetting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Trash2 size={16} color="#ef4444" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ts.dataRowLabel, { color: '#ef4444' }]}>
              {resetting ? 'Deleting...' : 'Reset all data'}
            </Text>
            <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>
              {resetting ? 'Please wait...' : 'Delete all tasks, notes, settings'}
            </Text>
          </View>
          <ChevronRight size={16} color="#ef4444" style={{ opacity: 0.5 }} />
        </Pressable>
      </View>

      {/* Reset confirmation modal */}
      <ConfirmModal
        visible={showResetConfirm}
        title="Reset all data"
        message="This permanently deletes all your tasks, notes, topics, and settings. This action cannot be undone."
        confirmLabel="Delete everything"
        cancelLabel="Cancel"
        destructive
        loading={resetting}
        onConfirm={handleResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Success modal */}
      <ConfirmModal
        visible={showSuccessModal}
        title="Success"
        message="All data has been deleted."
        confirmLabel="OK"
        cancelLabel=""
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />

      {/* Error modal */}
      <ConfirmModal
        visible={showErrorModal}
        title="Error"
        message="Failed to delete data. Please try again."
        confirmLabel="OK"
        cancelLabel=""
        destructive
        onConfirm={() => setShowErrorModal(false)}
        onCancel={() => setShowErrorModal(false)}
      />
    </>
  )
}

// ── Archive tab ────────────────────────────────────────────────────────────────

function ArchiveTab({ tokens, archivedTasks, onRestore, onDelete, onArchiveOld, getTopicColor }: {
  tokens: ReturnType<typeof useTheme>['tokens']
  archivedTasks: any[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  onArchiveOld: (days: number) => void
  getTopicColor: (t: string) => string
}) {
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filteredTasks = archivedTasks.filter((t: any) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.topic.toLowerCase().includes(search.toLowerCase()),
  )

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const fmtDuration = (mins: number): string => {
    if (!mins || mins <= 0) return '0m'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Auto-archive card */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <View style={ts.dataRow}>
          <View style={[ts.dataRowIcon, { backgroundColor: `${tokens.accentBlue}15` }]}>
            <ArchiveIcon size={16} color={tokens.accentBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Archived Tasks</Text>
              <Text style={[ts.archiveCountBadge, { color: tokens.textMuted, backgroundColor: tokens.bgInput }]}>
                {archivedTasks.length}
              </Text>
            </View>
            <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>
              Archive completed tasks older than 7 days
            </Text>
          </View>
          <Pressable
            onPress={() => onArchiveOld(7)}
            style={({ pressed }) => [
              ts.archiveOldBtn,
              { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Archive old completed tasks"
          >
            <ArchiveIcon size={14} color={tokens.textSecondary} />
            <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Archive Old</Text>
          </Pressable>
        </View>
      </View>

      {/* Search card (only if there are tasks) */}
      {archivedTasks.length > 0 && (
        <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
          <View style={[ts.archiveSearchRow, { backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary }]}>
            <Search size={16} color={tokens.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search archived tasks..."
              placeholderTextColor={tokens.textMuted}
              style={[ts.archiveSearchInput, { color: tokens.textPrimary }]}
              accessible
              accessibilityLabel="Search archived tasks"
            />
            {!!search && (
              <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search">
                <X size={14} color={tokens.textMuted} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Task list or empty state */}
      {filteredTasks.length === 0 ? (
        <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
          <View style={ts.archiveEmptyState}>
            <ArchiveIcon size={40} color={tokens.textMuted} strokeWidth={1.5} />
            <Text style={[ts.archiveEmptyText, { color: tokens.textMuted }]}>
              {archivedTasks.length === 0
                ? 'No archived tasks yet'
                : 'No tasks match your search'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary, padding: 0, overflow: 'hidden' }]}>
          <View style={ts.archiveHeader}>
            <Text style={[ts.archiveHeaderText, { color: tokens.textPrimary }]}>
              Archived Tasks
            </Text>
            <Text style={[ts.archiveCountBadge, { color: tokens.textMuted, backgroundColor: tokens.bgInput }]}>
              {filteredTasks.length}
            </Text>
          </View>
          {filteredTasks.map((task: any, index: number) => {
            const topicColor = getTopicColor(task.topic)
            const isConfirming = confirmDelete === task.id

            return (
              <View key={task.id}>
                {index > 0 && <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />}
                <View style={[ts.archiveTaskCard, { borderLeftColor: topicColor }]}>
                  <View style={ts.archiveTaskHeader}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[ts.archiveTaskTitle, { color: tokens.textPrimary }]} numberOfLines={2}>
                        {task.title}
                      </Text>
                      <View style={ts.archiveTaskMeta}>
                        <View style={ts.archiveMetaItem}>
                          <View style={[ts.archiveTopicDot, { backgroundColor: topicColor }]} />
                          <Text style={[ts.archiveMetaText, { color: tokens.textMuted }]}>{task.topic}</Text>
                        </View>
                        <View style={ts.archiveMetaItem}>
                          <Calendar size={12} color={tokens.textMuted} />
                          <Text style={[ts.archiveMetaText, { color: tokens.textMuted }]}>{formatDate(task.date)}</Text>
                        </View>
                        <View style={ts.archiveMetaItem}>
                          <Clock size={12} color={tokens.textMuted} />
                          <Text style={[ts.archiveMetaText, { color: tokens.textMuted }]}>{fmtDuration(task.duration)}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={ts.archiveActionBtns}>
                      <Pressable
                        onPress={() => onRestore(task.id)}
                        style={({ pressed }) => [
                          ts.archiveIconBtn,
                          { backgroundColor: `${tokens.accentGreen}15` },
                          pressed && { opacity: 0.7 },
                        ]}
                        accessibilityLabel="Restore task"
                        accessibilityRole="button"
                      >
                        <RotateCcw size={16} color={tokens.accentGreen} />
                      </Pressable>
                      <Pressable
                        onPress={() => setConfirmDelete(task.id)}
                        style={({ pressed }) => [
                          ts.archiveIconBtn,
                          { backgroundColor: `${tokens.accentRed}15` },
                          pressed && { opacity: 0.7 },
                        ]}
                        accessibilityLabel="Delete task permanently"
                        accessibilityRole="button"
                      >
                        <Trash2 size={16} color={tokens.accentRed} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Delete confirmation inline */}
                  {isConfirming && (
                    <View style={[ts.archiveConfirmRow, { backgroundColor: `${tokens.accentRed}10` }]}>
                      <Text style={[ts.archiveConfirmText, { color: tokens.accentRed }]}>Delete permanently?</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => setConfirmDelete(null)}
                          style={[ts.archiveConfirmBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }]}
                        >
                          <Text style={{ fontSize: 12, color: tokens.textSecondary }}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => { onDelete(task.id); setConfirmDelete(null) }}
                          style={[ts.archiveConfirmBtn, { backgroundColor: tokens.accentRed, borderColor: tokens.accentRed }]}
                          accessibilityRole="button"
                          accessibilityLabel="Confirm delete"
                        >
                          <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

// ── About tab ──────────────────────────────────────────────────────────────────

function AboutTab({
  tokens,
  user,
  isGuest,
  onSignOut,
  onExitGuest,
  onUpgrade,
}: {
  tokens: ReturnType<typeof useTheme>['tokens']
  user: any
  isGuest: boolean
  onSignOut: () => void
  onExitGuest: () => void
  onUpgrade: () => void
}) {
  const version = Constants.expoConfig?.version ?? '1.0.0'

  return (
    <>
      {/* Version info card */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        <View style={ts.dataRow}>
          <View style={[ts.dataRowIcon, { backgroundColor: `${tokens.accentBlue}15` }]}>
            <Info size={16} color={tokens.accentBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Daily Planner v{version}</Text>
            <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>Built with Expo · Firebase · React Native</Text>
          </View>
        </View>
      </View>

      {/* Account card */}
      <View style={[ts.dataCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
        {user && !isGuest && (
          <>
            <View style={ts.dataRow}>
              <View style={[ts.dataRowIcon, { backgroundColor: `${tokens.accentBlue}15` }]}>
                <Info size={16} color={tokens.accentBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>{user.email ?? 'Signed in'}</Text>
                <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>Your account</Text>
              </View>
            </View>
            <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />
            <Pressable
              onPress={onSignOut}
              style={({ pressed }) => [ts.dataRow, pressed && { backgroundColor: tokens.bgInput }]}
              accessibilityRole="button"
            >
              <View style={[ts.dataRowIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <LogOut size={16} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ts.dataRowLabel, { color: '#ef4444' }]}>Sign out</Text>
              </View>
              <ChevronRight size={16} color="#ef4444" style={{ opacity: 0.5 }} />
            </Pressable>
          </>
        )}
        {isGuest && (
          <>
            <View style={ts.dataRow}>
              <View style={[ts.dataRowIcon, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
                <Info size={16} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Guest Mode</Text>
                <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>Data stored locally on this device</Text>
              </View>
            </View>
            <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />
            <Pressable
              onPress={onUpgrade}
              style={({ pressed }) => [ts.dataRow, pressed && { backgroundColor: tokens.bgInput }]}
              accessibilityRole="button"
            >
              <View style={[ts.dataRowIcon, { backgroundColor: `${tokens.accentGreen}15` }]}>
                <UserPlus size={16} color={tokens.accentGreen} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ts.dataRowLabel, { color: tokens.textPrimary }]}>Create an account</Text>
                <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>Save your data to the cloud</Text>
              </View>
              <ChevronRight size={16} color={tokens.textMuted} />
            </Pressable>
            <View style={[ts.dataRowDivider, { backgroundColor: tokens.borderPrimary }]} />
            <Pressable
              onPress={onExitGuest}
              style={({ pressed }) => [ts.dataRow, pressed && { backgroundColor: tokens.bgInput }]}
              accessibilityRole="button"
            >
              <View style={[ts.dataRowIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <UserMinus size={16} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ts.dataRowLabel, { color: '#ef4444' }]}>Exit guest mode</Text>
                <Text style={[ts.dataRowSub, { color: tokens.textMuted }]}>Delete local data and return to sign-in</Text>
              </View>
              <ChevronRight size={16} color="#ef4444" style={{ opacity: 0.5 }} />
            </Pressable>
          </>
        )}
      </View>
    </>
  )
}

// ── Shared tab styles ──────────────────────────────────────────────────────────

const ts = StyleSheet.create({
  // Section headers — kept for web layout
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionSub: { fontSize: 13, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  // Card wrapper for mobile sub-screens
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    marginBottom: 16,
  },
  cardPadded: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  // Color dot for accent icon
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  // Toggle pill (used in Accessibility, Notifications)
  togglePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  togglePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Reminder chips
  reminderChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  // Accessibility tab (legacy styles, can be removed when a11y is fully migrated)
  a11yCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  a11yRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  a11yLabelCol: { flex: 1 },
  a11yTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  a11ySub: { fontSize: 12, lineHeight: 17 },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  toggleBtnOn: { backgroundColor: '#3b82f6' },
  toggleBtnOff: { borderWidth: 1 },
  toggleTextOn: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  toggleTextOff: { fontSize: 13, fontWeight: '600' },
  fontSizeRow: { flexDirection: 'row', gap: 10 },
  fontSizeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 4,
  },
  fontSizeBtnLabel: { lineHeight: 20 },
  fontSizeOptLabel: { fontSize: 11, fontWeight: '500' },
  previewBox: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginTop: 12,
  },
  previewLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  previewTask: { fontWeight: '500' },
  // Appearance
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  modeLabel: { fontSize: 13, fontWeight: '500' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4 },
      android: {},
      web: { boxShadow: '0 0 4px rgba(0,0,0,0.25)' },
    }),
    elevation: 4,
  },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hexPreview: { width: 44, height: 40, borderRadius: 8 },
  hexInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  preview: { borderRadius: 12, padding: 14, marginTop: 16 },
  appearancePreviewLabel: { fontSize: 12, marginBottom: 10 },
  previewRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  previewPrimary: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8 },
  previewPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  previewSecondary: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
  previewSecondaryText: { fontSize: 13, fontWeight: '500' },
  previewBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  previewBadgeText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  // Data / Archive / About rows — card style
  dataCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dataRowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  dataRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataRowLabel: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  dataRowSub: { fontSize: 12 },
  // About
  infoCard: { borderRadius: 12, padding: 16 },
  infoTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  infoSub: { fontSize: 13 },
  // Archive tab inline styles
  archiveOldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  archiveSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    margin: 12,
    marginTop: 0,
  },
  archiveSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  archiveEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  archiveEmptyText: {
    fontSize: 14,
  },
  archiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  archiveHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  archiveCountBadge: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  archiveTaskCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 3,
  },
  archiveTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  archiveTaskTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  archiveTaskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  archiveMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  archiveTopicDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  archiveMetaText: {
    fontSize: 12,
  },
  archiveActionBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  archiveIconBtn: {
    padding: 8,
    borderRadius: 8,
  },
  archiveConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  archiveConfirmText: {
    fontSize: 13,
  },
  archiveConfirmBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
})

// ── User profile card ──────────────────────────────────────────────────────────

function UserProfileCard({
  user,
  isGuest,
  collapsed,
  tokens,
}: {
  user: any
  isGuest: boolean
  collapsed: boolean
  tokens: ReturnType<typeof useTheme>['tokens']
}) {
  const email = user?.email ?? null
  const initial = email ? email[0].toUpperCase() : 'G'

  if (collapsed) {
    return (
      <View style={[pc.collapsed, { borderTopColor: tokens.borderPrimary }]}>
        <View style={[pc.avatar, { backgroundColor: tokens.accentBlue }]}>
          <Text style={pc.initial}>{initial}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[pc.card, { borderTopColor: tokens.borderPrimary }]}>
      <View style={[pc.avatar, { backgroundColor: tokens.accentBlue }]}>
        <Text style={pc.initial}>{initial}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[pc.name, { color: tokens.textPrimary }]} numberOfLines={1}>
          {email ?? 'Guest User'}
        </Text>
        {isGuest && (
          <View style={[pc.badge, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
            <Text style={[pc.badgeText, { color: '#f97316' }]}>Guest</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const pc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
  collapsed: { alignItems: 'center', padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  initial: { color: '#fff', fontSize: 14, fontWeight: '700' },
  name: { fontSize: 13, fontWeight: '500' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 4, marginTop: 3 },
  badgeText: { fontSize: 10, fontWeight: '600' },
})

// ── Main screen ────────────────────────────────────────────────────────────────

export default function SettingsModal() {
  const { tokens } = useTheme()
  const router = useRouter()
  const { user, isGuest, signOut, exitGuestMode } = useAuth()
  const { exportData, exportAsIcs, importData, resetAllData, archivedTasks, restoreTask, deleteArchivedTask, archiveCompletedTasks, getTopicColor } = useProgress({ user })
  const { width } = useWindowDimensions()

  const [activeTab, setActiveTab] = useState<TabId>('appearance')
  const [mobileScreen, setMobileScreen] = useState<'list' | TabId>('list')

  const isWide = Platform.OS === 'web' && width >= WIDE_BREAKPOINT

  const styles = makeStyles(tokens)

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/') } },
    ])
  }, [signOut, router])

  const handleExitGuest = useCallback(() => {
    Alert.alert('Exit guest mode', 'Your local data will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Exit anyway', style: 'destructive', onPress: async () => {
          const r = await exitGuestMode()
          if (r.success) router.replace('/')
          else Alert.alert('Error', r.error)
        }
      },
    ])
  }, [exitGuestMode, router])

  const handleUpgrade = useCallback(() => {
    router.back()
    setTimeout(() => router.push('/auth'), 100)
  }, [router])

  // Tab content renderer
  const renderTab = (id: TabId) => {
    switch (id) {
      case 'appearance':
        return <AppearanceTab tokens={tokens} />
      case 'accessibility':
        return <AccessibilityTab tokens={tokens} />
      case 'notifications':
        return <NotificationsTab tokens={tokens} />
      case 'data':
        return (
          <DataTab
            tokens={tokens}
            exportData={exportData}
            exportAsIcs={exportAsIcs}
            importData={importData}
            resetAllData={resetAllData}
          />
        )
      case 'archive':
        return (
          <ArchiveTab
            tokens={tokens}
            archivedTasks={archivedTasks ?? []}
            onRestore={restoreTask}
            onDelete={deleteArchivedTask}
            onArchiveOld={archiveCompletedTasks}
            getTopicColor={getTopicColor}
          />
        )
      case 'about':
        return (
          <AboutTab
            tokens={tokens}
            user={user}
            isGuest={isGuest}
            onSignOut={handleSignOut}
            onExitGuest={handleExitGuest}
            onUpgrade={handleUpgrade}
          />
        )
    }
  }

  // ── Wide layout: sidebar + content ──────────────────────────────────────────

  if (isWide) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgPrimary }]}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.wideRoot}>
          <View style={[styles.wideCard, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>

            {/* Card header */}
            <View style={[styles.cardHeader, { borderBottomColor: tokens.borderPrimary }]}>
              <View style={styles.cardHeaderLeft}>
                <Settings size={18} color={tokens.textSecondary} />
                <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>Settings</Text>
              </View>
              <Pressable
                onPress={() => router.back()}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close settings"
              >
                <X size={20} color={tokens.textMuted} />
              </Pressable>
            </View>

            {/* Two-column body */}
            <View style={styles.cardBody}>
              {/* Left tab list */}
              <View style={[styles.tabList, { borderRightColor: tokens.borderPrimary }]}>
                {TABS.map(({ id, label, Icon }) => {
                  const active = activeTab === id
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setActiveTab(id)}
                      style={[
                        styles.tabItem,
                        active && { backgroundColor: tokens.accentBlue },
                        !active && { backgroundColor: 'transparent' },
                      ]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                    >
                      <Icon size={15} color={active ? '#fff' : tokens.textSecondary} />
                      <Text style={[styles.tabLabel, { color: active ? '#fff' : tokens.textSecondary, fontWeight: active ? '600' : '400' }]}>
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
                {/* User profile at bottom of sidebar */}
                <View style={{ flex: 1 }} />
                <UserProfileCard user={user} isGuest={isGuest} collapsed={false} tokens={tokens} />
              </View>

              {/* Right content */}
              <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner} showsVerticalScrollIndicator={false}>
                {renderTab(activeTab)}
              </ScrollView>
            </View>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── Mobile: full-screen with drill-down (Profile page style) ─────────────────

  const currentTabDef = TABS.find(t => t.id === mobileScreen as string)

  const handleClose = useCallback(() => {
    // Try dismiss for modals, fall back to back(), then replace to home
    if (router.canDismiss?.()) {
      router.dismiss()
    } else if (router.canGoBack?.()) {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }, [router])

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgPrimary }]}>
      <StatusBar barStyle="dark-content" />

      {/* Mobile header — breadcrumb style */}
      <View style={[styles.mobileHeader, { borderBottomColor: tokens.borderPrimary }]}>
        <Pressable
          onPress={() => mobileScreen === 'list' ? handleClose() : setMobileScreen('list')}
          style={({ pressed }) => [
            styles.mobileBackBtn,
            { backgroundColor: tokens.bgSecondary },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={mobileScreen === 'list' ? 'Close settings' : 'Back to settings list'}
        >
          <ChevronLeft size={18} color={tokens.textSecondary} />
        </Pressable>
        <View style={styles.breadcrumbRow}>
          {mobileScreen === 'list' ? (
            <Text style={[styles.breadcrumbCurrent, { color: tokens.textPrimary }]}>Settings</Text>
          ) : (
            <>
              <Pressable
                onPress={() => setMobileScreen('list')}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
                accessibilityRole="button"
                accessibilityLabel="Back to settings"
              >
                <Text style={[styles.breadcrumbParent, { color: tokens.textMuted }]}>Settings</Text>
              </Pressable>
              <Text style={[styles.breadcrumbSep, { color: tokens.textMuted }]}>›</Text>
              <Text style={[styles.breadcrumbCurrent, { color: tokens.textPrimary }]}>
                {currentTabDef?.label}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Mobile body */}
      {mobileScreen === 'list' ? (
        <ScrollView
          style={styles.mobileScroll}
          contentContainerStyle={styles.mobileContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tab menu section — no profile card */}
          <View style={[styles.mobileMenuSection, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
            {TABS.map(({ id, label, Icon }, index) => (
              <React.Fragment key={id}>
                {index > 0 && (
                  <View style={[styles.mobileMenuDivider, { backgroundColor: tokens.borderPrimary }]} />
                )}
                <Pressable
                  onPress={() => setMobileScreen(id)}
                  style={({ pressed }) => [
                    styles.mobileMenuItem,
                    pressed && { backgroundColor: tokens.bgInput },
                  ]}
                  accessibilityRole="button"
                >
                  <View style={[styles.mobileMenuIconWrap, { backgroundColor: tokens.bgInput }]}>
                    <Icon size={18} color={tokens.textSecondary} />
                  </View>
                  <Text style={[styles.mobileMenuLabel, { color: tokens.textPrimary }]}>{label}</Text>
                  <ChevronRight size={18} color={tokens.textMuted} />
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.mobileScroll}
          contentContainerStyle={styles.mobileContent}
          showsVerticalScrollIndicator={false}
        >
          {renderTab(mobileScreen as TabId)}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    safe: { flex: 1 },
    // Wide
    wideRoot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    wideCard: {
      width: '100%',
      maxWidth: 700,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
      maxHeight: '88%',
      // Shadow
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
        android: {},
        web: { boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
      }),
      elevation: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 18,
      borderBottomWidth: 1,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardTitle: { fontSize: 17, fontWeight: '700' },
    closeBtn: { padding: 4 },
    cardBody: {
      flexDirection: 'row',
      flex: 1,
      overflow: 'hidden',
    },
    tabList: {
      width: 164,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRightWidth: 1,
    },
    tabItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 8,
      marginBottom: 2,
    },
    tabLabel: { fontSize: 13 },
    tabContent: { flex: 1 },
    tabContentInner: { padding: 24, paddingBottom: 32 },
    // Mobile — Profile page style
    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 8,
    },
    mobileBackBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        web: { cursor: 'pointer', outlineStyle: 'none' } as any,
      }),
    },
    mobileHeaderTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    breadcrumbRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    breadcrumbParent: {
      fontSize: 15,
      fontWeight: '500',
    },
    breadcrumbSep: {
      fontSize: 15,
    },
    breadcrumbCurrent: {
      fontSize: 15,
      fontWeight: '600',
    },
    mobileScroll: {
      flex: 1,
    },
    mobileContent: {
      padding: 16,
      gap: 16,
    },
    // Menu section — rounded card
    mobileMenuSection: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    mobileMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    mobileMenuIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mobileMenuLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
    },
    mobileMenuDivider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 60,
    },
  })
}
