/**
 * VoiceInput — speech-to-text task entry.
 *
 * Web:    Uses the browser's Web Speech API (SpeechRecognition).
 *         Tap the mic to start/stop listening. Transcript fills automatically.
 * Native: No STT SDK available — shows a TextInput beneath the mic for
 *         manual entry. Examples still parse and advance to preview.
 *
 * Requirements: 16.1–16.4
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  Mic,
  MicOff,
  RotateCcw,
  Tag,
} from 'lucide-react-native'
import * as Speech from 'expo-speech'
import { useTheme } from '@/src/hooks/useTheme'
import { fmtDuration } from '@/src/lib/utils'

// ── parseVoiceCommand ─────────────────────────────────────────────────────────

interface Topic {
  name: string
  [key: string]: unknown
}

interface ParsedCommand {
  title: string
  duration: number | null
  dueTime: string | null
  priority: 'high' | 'medium' | 'low' | null
  topic: string | null
  date: string
}

function parseVoiceCommand(text: string, knownTopics: Topic[] = []): ParsedCommand {
  const raw = text.trim()
  let title = raw
  let duration: number | null = null
  let dueTime: string | null = null
  let priority: 'high' | 'medium' | 'low' | null = null
  let topic: string | null = null
  let date: string | null = null

  const durMatch =
    title.match(/\bfor\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i) ||
    title.match(/\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i)
  if (durMatch) {
    const val = parseFloat(durMatch[1])
    const unit = durMatch[2].toLowerCase()
    duration = unit.startsWith('h') ? Math.round(val * 60) : Math.round(val)
    title = title.replace(durMatch[0], '').trim()
  }

  const timeMatch = title.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (timeMatch) {
    let h = parseInt(timeMatch[1])
    const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const ampm = timeMatch[3]?.toLowerCase()
    if (ampm === 'pm' && h < 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    dueTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    title = title.replace(timeMatch[0], '').trim()
  }

  if (/\b(high\s+priority|urgent|important)\b/i.test(title)) {
    priority = 'high'
    title = title.replace(/\b(high\s+priority|urgent|important)\b/i, '').trim()
  } else if (/\b(medium\s+priority|normal)\b/i.test(title)) {
    priority = 'medium'
    title = title.replace(/\b(medium\s+priority|normal)\b/i, '').trim()
  } else if (/\b(low\s+priority|whenever|someday)\b/i.test(title)) {
    priority = 'low'
    title = title.replace(/\b(low\s+priority|whenever|someday)\b/i, '').trim()
  }

  const today = new Date()
  const todayStr = today.toLocaleDateString('en-CA')
  const tomorrowStr = new Date(today.getTime() + 86_400_000).toLocaleDateString('en-CA')

  if (/\btoday\b/i.test(title)) {
    date = todayStr; title = title.replace(/\btoday\b/i, '').trim()
  } else if (/\btomorrow\b/i.test(title)) {
    date = tomorrowStr; title = title.replace(/\btomorrow\b/i, '').trim()
  } else {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayMatch = title.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
    if (dayMatch) {
      const targetDay = days.indexOf(dayMatch[2].toLowerCase())
      const diff = ((targetDay - today.getDay() + 7) % 7) || 7
      date = new Date(today.getTime() + diff * 86_400_000).toLocaleDateString('en-CA')
      title = title.replace(dayMatch[0], '').trim()
    }
  }

  for (const t of knownTopics) {
    const re = new RegExp(`\\b${t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(title)) { topic = t.name; title = title.replace(re, '').trim(); break }
  }

  title = title
    .replace(/^(add|create|new|make|schedule|remind me to|remind me|set|a|an|the)\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,.\s]+$/, '')
    .trim()
  if (title) title = title[0].toUpperCase() + title.slice(1)

  return { title, duration, dueTime, priority, topic, date: date ?? todayStr }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoiceInputProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onResult: (parsed: ParsedCommand) => void
  readonly topics?: Topic[]
}

const EXAMPLES = [
  'Study React for 45 minutes tomorrow',
  'High priority team meeting at 3pm',
  'Learning task for 1 hour',
  'Review notes for 30 minutes next Monday',
]

// ── Web Speech API helpers ────────────────────────────────────────────────────

function getSpeechRecognition(): any {
  if (Platform.OS !== 'web') return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoiceInput({ isOpen, onClose, onResult, topics = [] }: VoiceInputProps) {
  const { tokens } = useTheme()
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState<ParsedCommand | null>(null)
  const [stage, setStage] = useState<'listen' | 'preview'>('listen')
  const [isListening, setIsListening] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Tap the mic to start listening')
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<TextInput>(null)

  const SpeechRecognitionClass = getSpeechRecognition()
  const webSupported = !!SpeechRecognitionClass

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      recognitionRef.current?.abort()
      setIsListening(false)
    }
  }, [isOpen])

  // On web, check mic permission on open
  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web') return
    if (!webSupported) {
      setStatusMsg('Voice not supported in this browser — type or use an example')
      return
    }
    const nav = navigator as any
    if (nav.permissions) {
      nav.permissions.query({ name: 'microphone' }).then((result: any) => {
        if (result.state === 'denied') {
          setStatusMsg('Microphone is blocked — enable it in browser settings, then reload')
        } else if (result.state === 'granted') {
          setStatusMsg('Tap the mic to start listening')
        } else {
          setStatusMsg('Tap the mic — the browser will ask for microphone permission')
        }
      }).catch(() => setStatusMsg('Tap the mic to start listening'))
    }
  }, [isOpen, webSupported])

  const s = makeStyles(tokens)

  const reset = () => {
    recognitionRef.current?.abort()
    setIsListening(false)
    setTranscript('')
    setParsed(null)
    setStage('listen')
    setStatusMsg(webSupported ? 'Tap the mic to start listening' : 'Type your task or tap an example')
  }

  const handleClose = () => { reset(); onClose() }

  const handleParse = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const p = parseVoiceCommand(trimmed, topics)
    if (!p.title) return
    setParsed(p)
    setStage('preview')
    if (Platform.OS !== 'web') {
      Speech.speak(`Got it. ${p.title}`, { language: 'en-US', rate: 1.0 })
    }
  }

  // ── Web: toggle SpeechRecognition ─────────────────────────────────────────
  const toggleListening = () => {
    if (!webSupported) {
      inputRef.current?.focus()
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setIsListening(true)
      setStatusMsg('Listening… speak your task now')
    }

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      const current = (final || interim).trim()
      if (current) setTranscript(current)
      if (final.trim()) setStatusMsg(`Heard: "${final.trim()}"`)
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatusMsg('Microphone access denied.\nAllow mic in your browser settings, then try again.')
      } else if (event.error === 'no-speech') {
        setStatusMsg('No speech detected — tap mic to try again')
      } else if (event.error === 'network') {
        setStatusMsg('Network error — check your connection and try again')
      } else {
        setStatusMsg(`Error (${event.error}) — tap mic to try again`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setTranscript(prev => {
        if (prev.trim()) {
          setStatusMsg('Tap "Done" to add this task, or tap mic to re-record')
        } else {
          setStatusMsg('Tap the mic to try again')
        }
        return prev
      })
    }

    // Small timeout so the browser registers this as a fresh user-gesture context
    setStatusMsg('Starting microphone…')
    setTimeout(() => {
      try {
        recognition.start()
      } catch (e) {
        setIsListening(false)
        setStatusMsg('Could not start microphone — tap to try again')
      }
    }, 80)
  }

  const handleExample = (ex: string) => {
    recognitionRef.current?.abort()
    setIsListening(false)
    setTranscript(ex)
    handleParse(ex)
  }

  const handleDone = () => {
    recognitionRef.current?.stop()
    if (transcript.trim()) handleParse(transcript)
  }

  const handleConfirm = () => {
    if (parsed?.title) { onResult(parsed); handleClose() }
  }

  // Preview chips
  const todayStr = new Date().toLocaleDateString('en-CA')
  const tomorrowStr = new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA')
  const chips = parsed ? [
    parsed.duration ? { Icon: Clock, label: fmtDuration(parsed.duration) ?? '', color: tokens.accentBlue } : null,
    parsed.dueTime ? { Icon: Clock, label: `at ${parsed.dueTime}`, color: tokens.accentPurple } : null,
    parsed.priority ? {
      Icon: Flag, label: parsed.priority,
      color: parsed.priority === 'high' ? tokens.accentRed : parsed.priority === 'medium' ? tokens.accentOrange : tokens.accentGreen,
    } : null,
    parsed.topic ? { Icon: Tag, label: parsed.topic, color: '#14b8a6' } : null,
    parsed.date ? {
      Icon: Calendar,
      label: parsed.date === todayStr ? 'Today' : parsed.date === tomorrowStr ? 'Tomorrow' : parsed.date,
      color: '#6366f1',
    } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null) : []

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={handleClose} accessibilityLabel="Close voice input">
        {/* View instead of Pressable so mic button gets a clean top-level user gesture */}
        <View style={s.card}>

          {/* ── Listening stage ── */}
          {stage === 'listen' && (
            <>
              {/* Mic button */}
              <Pressable
                onPress={toggleListening}
                style={[s.micOuter, isListening && s.micOuterActive]}
                accessibilityRole="button"
                accessibilityLabel={isListening ? 'Stop listening' : 'Start listening'}
              >
                <View style={[s.micInner, isListening && s.micInnerActive]}>
                  {isListening
                    ? <Mic size={28} color="#fff" />
                    : <MicOff size={28} color="#fff" />}
                </View>
              </Pressable>

              <Text style={[s.listenTitle, { color: tokens.textPrimary }]}>
                {isListening ? 'Listening...' : 'Voice Input'}
              </Text>
              <Text style={[s.statusMsg, { color: tokens.textSecondary }]}>
                {statusMsg}
              </Text>

              {/* Live transcript display */}
              {transcript.length > 0 && (
                <View style={[s.transcriptBox, { backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary }]}>
                  <Text style={[s.transcriptText, { color: tokens.textPrimary }]}>
                    {transcript}
                  </Text>
                </View>
              )}

              {/* Done button — shown when there's a transcript */}
              {transcript.length > 0 && (
                <Pressable
                  onPress={handleDone}
                  style={({ pressed }) => [s.doneBtn, { backgroundColor: tokens.accentBlue }, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Parse this task"
                >
                  <Text style={s.doneBtnText}>Done</Text>
                </Pressable>
              )}

              {/* Native fallback: text input */}
              {!webSupported && (
                <TextInput
                  ref={inputRef}
                  style={[s.textInput, { backgroundColor: tokens.bgInput, borderColor: tokens.borderPrimary, color: tokens.textPrimary }]}
                  value={transcript}
                  onChangeText={setTranscript}
                  placeholder='e.g. "Study React for 45 minutes"'
                  placeholderTextColor={tokens.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={() => handleParse(transcript)}
                  accessibilityLabel="Task description input"
                />
              )}

              {/* Examples */}
              <View style={[s.examplesBox, { backgroundColor: tokens.bgInput }]}>
                <Text style={[s.examplesLabel, { color: tokens.textMuted }]}>
                  TRY AN EXAMPLE — TAP TO USE
                </Text>
                {EXAMPLES.map((ex, i) => (
                  <Pressable
                    key={ex}
                    onPress={() => handleExample(ex)}
                    style={({ pressed }) => [
                      s.exampleRow,
                      i < EXAMPLES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.borderPrimary },
                      pressed && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={ex}
                  >
                    <Text style={[s.exampleText, { color: tokens.accentBlue }]}>"{ex}"</Text>
                    <Text style={[s.exampleHint, { color: tokens.textMuted }]}>↵ try</Text>
                  </Pressable>
                ))}
              </View>

              {/* Cancel */}
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [s.cancelBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={[s.cancelText, { color: tokens.textPrimary }]}>Cancel</Text>
              </Pressable>
            </>
          )}

          {/* ── Preview stage ── */}
          {stage === 'preview' && parsed && (
            <>
              <View style={[s.checkWrap, { backgroundColor: `${tokens.accentGreen}18`, borderColor: `${tokens.accentGreen}40` }]}>
                <CheckCircle2 size={24} color={tokens.accentGreen} />
              </View>

              <Text style={[s.previewHeading, { color: tokens.textPrimary }]}>Here's what I heard</Text>

              <View style={[s.parsedBox, { backgroundColor: tokens.bgInput }]}>
                <Text style={[s.parsedLabel, { color: tokens.textMuted }]}>Task title</Text>
                <Text style={[s.parsedTitle, { color: tokens.textPrimary }]}>{parsed.title || '—'}</Text>
              </View>

              {chips.length > 0 && (
                <View style={s.chipsRow}>
                  {chips.map((c, i) => (
                    <View key={i} style={[s.chip, { backgroundColor: `${c.color}18`, borderColor: `${c.color}40` }]}>
                      <c.Icon size={12} color={c.color} />
                      <Text style={[s.chipText, { color: c.color }]}>{c.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[s.originalTranscript, { color: tokens.textMuted }]}>"{transcript}"</Text>

              <View style={s.previewActions}>
                <Pressable
                  onPress={reset}
                  style={({ pressed }) => [s.retryBtn, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgInput }, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Try again"
                >
                  <RotateCcw size={14} color={tokens.textSecondary} />
                  <Text style={[s.retryText, { color: tokens.textSecondary }]}>Try again</Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirm}
                  disabled={!parsed.title}
                  style={({ pressed }) => [s.addBtn, { backgroundColor: tokens.accentBlue }, !parsed.title && { opacity: 0.5 }, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Add task"
                >
                  <Text style={s.addBtnText}>Add Task</Text>
                </Pressable>
              </View>
            </>
          )}

        </View>
      </Pressable>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: tokens.bgSecondary,
      borderRadius: 24,
      padding: 28,
      width: '100%',
      maxWidth: 460,
      alignItems: 'center',
    },
    // Mic button
    micOuter: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: 'rgba(99,130,246,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    micOuterActive: {
      backgroundColor: 'rgba(229,57,53,0.18)',
    },
    micInner: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: '#e53935',
      alignItems: 'center',
      justifyContent: 'center',
    },
    micInnerActive: {
      backgroundColor: '#c62828',
    },
    // Titles
    listenTitle: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 6,
    },
    statusMsg: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    // Live transcript
    transcriptBox: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      width: '100%',
      marginBottom: 10,
    },
    transcriptText: {
      fontSize: 15,
      fontStyle: 'italic',
      textAlign: 'center',
      lineHeight: 22,
    },
    // Done button
    doneBtn: {
      width: '100%',
      paddingVertical: 11,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 14,
    },
    doneBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    // Native text input
    textInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      width: '100%',
      marginBottom: 14,
    },
    // Examples
    examplesBox: {
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
      width: '100%',
      marginBottom: 16,
    },
    examplesLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    exampleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    exampleText: {
      fontSize: 13,
      flex: 1,
    },
    exampleHint: {
      fontSize: 11,
      marginLeft: 8,
    },
    // Cancel
    cancelBtn: {
      width: '100%',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
    },
    // Preview
    checkWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    previewHeading: {
      fontSize: 17,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 16,
    },
    parsedBox: {
      borderRadius: 12,
      padding: 14,
      marginBottom: 14,
      width: '100%',
    },
    parsedLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    parsedTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
      marginBottom: 16,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '500',
    },
    originalTranscript: {
      fontSize: 12,
      fontStyle: 'italic',
      textAlign: 'center',
      marginBottom: 20,
    },
    previewActions: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    retryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
    },
    retryText: {
      fontSize: 14,
      fontWeight: '500',
    },
    addBtn: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    addBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff',
    },
  })
}
