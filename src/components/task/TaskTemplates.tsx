/**
 * TaskTemplates — collapsible templates management panel.
 *
 * Port of frontend/src/components/TaskTemplates.jsx to React Native.
 * - Replaces HTML modals with React Native Modal.
 * - Replaces DatePickerField (web) with the RN DatePickerField from
 *   @/src/components/DatePickerField.
 * - All touch events use Pressable.
 *
 * Requirements: 19.x
 */

import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { ChevronDown, ChevronRight, Clock, Copy, Plus, Tag, Trash2, X } from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { DatePickerField } from '@/src/components/DatePickerField'
import { fmtDuration } from '@/src/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Template {
  id: string
  title: string
  description?: string
  topic?: string
  duration?: number
  subtasks?: Array<{ title: string }>
  [key: string]: unknown
}

export interface TaskTemplatesProps {
  readonly templates: Template[]
  readonly topics?: Array<{ name: string; color?: string }>
  readonly onAddTemplate?: () => void
  readonly onDeleteTemplate: (id: string) => void
  readonly onCreateFromTemplate: (id: string, date: string) => void
  readonly getTopicColor: (topic: string) => string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TaskTemplates({
  templates,
  topics = [],
  onDeleteTemplate,
  onCreateFromTemplate,
  getTopicColor,
}: TaskTemplatesProps) {
  const { tokens } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [targetDate, setTargetDate] = useState(
    new Date().toLocaleDateString('en-CA')
  )

  const styles = makeStyles(tokens)

  // Nothing to render if there are no templates (matches web behaviour)
  if (templates.length === 0) return null

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setTargetDate(new Date().toLocaleDateString('en-CA'))
    setShowCreateModal(true)
  }

  const handleConfirmCreate = () => {
    if (selectedTemplate && targetDate) {
      onCreateFromTemplate(selectedTemplate.id, targetDate)
      setShowCreateModal(false)
      setSelectedTemplate(null)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setSelectedTemplate(null)
  }

  return (
    <>
      {/* ── Collapsible panel ── */}
      <View style={styles.card}>

        {/* Header row */}
        <Pressable
          onPress={() => setIsExpanded(v => !v)}
          style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Task Templates"
          accessibilityState={{ expanded: isExpanded }}
        >
          <View style={styles.headerLeft}>
            <Copy size={16} color={tokens.accentPurple} />
            <Text style={styles.headerTitle}>Task Templates</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{templates.length}</Text>
            </View>
          </View>
          {isExpanded
            ? <ChevronDown size={16} color={tokens.textMuted} />
            : <ChevronRight size={16} color={tokens.textMuted} />
          }
        </Pressable>

        {/* Template list */}
        {isExpanded && (
          <View style={styles.listContainer}>
            {templates.map(template => {
              const color = getTopicColor(template.topic ?? '')
              return (
                <View key={template.id} style={styles.templateRow}>

                  {/* Meta + content */}
                  <View style={styles.templateContent}>
                    <View style={styles.templateMeta}>
                      {template.topic ? (
                        <View style={[styles.topicChip, {
                          backgroundColor: `${color}20`,
                          borderColor: `${color}40`,
                        }]}>
                          <Tag size={10} color={color} />
                          <Text style={[styles.topicChipText, { color }]}>
                            {template.topic}
                          </Text>
                        </View>
                      ) : null}
                      {template.duration ? (
                        <View style={styles.durationBadge}>
                          <Clock size={10} color={tokens.textMuted} />
                          <Text style={styles.durationText}>
                            {fmtDuration(template.duration)}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.templateTitle} numberOfLines={2}>
                      {template.title}
                    </Text>

                    {template.description ? (
                      <Text style={styles.templateDesc} numberOfLines={2}>
                        {template.description}
                      </Text>
                    ) : null}

                    {template.subtasks && template.subtasks.length > 0 ? (
                      <Text style={styles.subtaskCount}>
                        {template.subtasks.length} subtask
                        {template.subtasks.length !== 1 ? 's' : ''}
                      </Text>
                    ) : null}
                  </View>

                  {/* Actions */}
                  <View style={styles.templateActions}>
                    <Pressable
                      onPress={() => handleUseTemplate(template)}
                      style={({ pressed }) => [styles.useBtn, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Use template: ${template.title}`}
                    >
                      <Plus size={14} color="#ffffff" />
                      <Text style={styles.useBtnText}>Use</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => onDeleteTemplate(template.id)}
                      style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete template: ${template.title}`}
                    >
                      <Trash2 size={14} color={tokens.textMuted} />
                    </Pressable>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* ── Create-from-template modal ── */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
        statusBarTranslucent
      >
        <Pressable
          style={styles.overlay}
          onPress={handleCloseModal}
          accessibilityLabel="Close modal"
        >
          <Pressable onPress={() => { }} style={styles.modalContent}>

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create from Template</Text>
              <Pressable
                onPress={handleCloseModal}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={tokens.textMuted} />
              </Pressable>
            </View>

            {/* Template preview */}
            {selectedTemplate && (
              <View style={styles.previewBox}>
                <View style={styles.previewMeta}>
                  {selectedTemplate.topic ? (
                    <View style={[styles.topicChip, {
                      backgroundColor: `${getTopicColor(selectedTemplate.topic)}20`,
                      borderColor: `${getTopicColor(selectedTemplate.topic)}40`,
                    }]}>
                      <Text style={[styles.topicChipText, {
                        color: getTopicColor(selectedTemplate.topic),
                      }]}>
                        {selectedTemplate.topic}
                      </Text>
                    </View>
                  ) : null}
                  {selectedTemplate.duration ? (
                    <Text style={styles.durationText}>
                      {fmtDuration(selectedTemplate.duration)}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.previewTitle}>{selectedTemplate.title}</Text>
              </View>
            )}

            {/* Date picker */}
            <View style={styles.dateSection}>
              <Text style={styles.dateSectionLabel}>Schedule for Date</Text>
              <DatePickerField
                value={targetDate}
                onChange={setTargetDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            {/* Footer actions */}
            <View style={styles.modalFooter}>
              <Pressable
                onPress={handleCloseModal}
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmCreate}
                disabled={!targetDate}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  !targetDate && styles.confirmBtnDisabled,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create Task"
              >
                <Plus size={16} color="#ffffff" />
                <Text style={styles.confirmBtnText}>Create Task</Text>
              </Pressable>
            </View>

          </Pressable>

        </Pressable>
    </Modal>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    card: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.borderPrimary,
      marginBottom: 20,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    countBadge: {
      backgroundColor: tokens.bgInput,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    countText: {
      fontSize: 12,
      color: tokens.textMuted,
    },
    listContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    templateRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: tokens.bgInput,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.borderPrimary,
      padding: 12,
      gap: 10,
    },
    templateContent: {
      flex: 1,
      gap: 4,
    },
    templateMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    topicChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      borderWidth: 1,
    },
    topicChipText: {
      fontSize: 11,
      fontWeight: '500',
    },
    durationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    durationText: {
      fontSize: 11,
      color: tokens.textMuted,
    },
    templateTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    templateDesc: {
      fontSize: 12,
      color: tokens.textMuted,
    },
    subtaskCount: {
      fontSize: 11,
      color: tokens.textMuted,
    },
    templateActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    useBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: tokens.accentBlue,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    useBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#ffffff',
    },
    deleteBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: tokens.bgInput,
    },
    // ── modal ──
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 420,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    closeBtn: {
      padding: 4,
    },
    previewBox: {
      backgroundColor: tokens.bgInput,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.borderPrimary,
      padding: 12,
      marginBottom: 20,
      gap: 6,
    },
    previewMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    previewTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    dateSection: {
      marginBottom: 20,
      gap: 6,
    },
    dateSectionLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: tokens.bgInput,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    confirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: tokens.accentBlue,
    },
    confirmBtnDisabled: {
      opacity: 0.5,
    },
    confirmBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff',
    },
  })
}
