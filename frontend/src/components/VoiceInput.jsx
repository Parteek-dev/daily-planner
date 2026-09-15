import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, X, Loader2 } from 'lucide-react'

export default function VoiceInput({ onResult, onClose, isOpen }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'

    recognitionRef.current.onresult = (event) => {
      const current = event.resultIndex
      const result = event.results[current]
      const text = result[0].transcript
      setTranscript(text)

      if (result.isFinal) {
        setIsListening(false)
      }
    }

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setError(event.error === 'not-allowed' 
        ? 'Microphone access denied. Please allow microphone access.'
        : 'Could not recognize speech. Please try again.')
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen && isSupported) {
      startListening()
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [isOpen, isSupported])

  const startListening = () => {
    if (!recognitionRef.current) return
    setError(null)
    setTranscript('')
    setIsListening(true)
    try {
      recognitionRef.current.start()
    } catch (e) {
      console.error('Failed to start recognition:', e)
    }
  }

  const stopListening = () => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
    setIsListening(false)
  }

  const handleSubmit = () => {
    if (transcript.trim()) {
      onResult(transcript.trim())
      onClose()
    }
  }

  const handleCancel = () => {
    stopListening()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
        {!isSupported ? (
          <>
            <MicOff size={48} color="var(--accent-red)" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Voice Input Not Supported
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              Your browser doesn't support voice input. Try using Chrome or Edge.
            </p>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            {/* Mic animation */}
            <div style={{ 
              position: 'relative', 
              width: 100, 
              height: 100, 
              margin: '0 auto 24px',
            }}>
              {/* Pulse rings */}
              {isListening && (
                <>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: 'var(--accent-blue)',
                    opacity: 0.2,
                    animation: 'pulse-ring 1.5s infinite',
                  }} />
                  <div style={{
                    position: 'absolute',
                    inset: 10,
                    borderRadius: '50%',
                    background: 'var(--accent-blue)',
                    opacity: 0.3,
                    animation: 'pulse-ring 1.5s infinite 0.3s',
                  }} />
                </>
              )}
              
              {/* Mic button */}
              <button
                onClick={isListening ? stopListening : startListening}
                style={{
                  position: 'absolute',
                  inset: 20,
                  borderRadius: '50%',
                  background: isListening ? 'var(--accent-red)' : 'var(--accent-blue)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.15s ease, background 0.15s ease',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {isListening ? (
                  <MicOff size={28} color="white" />
                ) : (
                  <Mic size={28} color="white" />
                )}
              </button>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              {isListening ? 'Listening...' : 'Voice Input'}
            </h2>
            
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              {isListening 
                ? 'Speak your task title clearly'
                : 'Click the microphone to start'}
            </p>

            {/* Transcript */}
            {transcript && (
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                minHeight: 60,
              }}>
                <p style={{ 
                  fontSize: 16, 
                  color: 'var(--text-primary)',
                  fontStyle: isListening ? 'italic' : 'normal',
                }}>
                  "{transcript}"
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
              }}>
                <p style={{ fontSize: 13, color: 'var(--accent-red)' }}>{error}</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleCancel}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={!transcript.trim()}
                style={{ flex: 1 }}
              >
                Add Task
              </button>
            </div>

            {/* Tips */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
              Tip: Say something like "Review React documentation for 30 minutes"
            </p>
          </>
        )}

        {/* Pulse animation keyframes */}
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.4; }
            100% { transform: scale(1.2); opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  )
}
