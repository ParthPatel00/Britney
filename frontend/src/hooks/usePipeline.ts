'use client'

import { useEffect, useRef, useState } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import type { AgentEvent } from '../lib/types'

interface UsePipelineResult {
  isConnected: boolean
  error: string | null
}

export function usePipeline(campaignId: string | null): UsePipelineResult {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleAgentEvent = useCampaignStore((s) => s.handleAgentEvent)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!campaignId) return

    // Close existing connection
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    setError(null)
    setIsConnected(false)

    const es = new EventSource(`/api/stream/campaign/${campaignId}`)
    esRef.current = es

    es.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    es.onmessage = (evt) => {
      try {
        const event = JSON.parse(evt.data) as AgentEvent
        handleAgentEvent(event)

        // Stop listening once pipeline is complete
        if (event.event_type === 'pipeline_complete') {
          es.close()
          esRef.current = null
          setIsConnected(false)
        }
      } catch {
        // Ignore malformed events
      }
    }

    es.onerror = () => {
      setIsConnected(false)
      setError('Connection lost. Retrying...')
      // EventSource will retry automatically
    }

    return () => {
      es.close()
      esRef.current = null
      setIsConnected(false)
    }
  }, [campaignId, handleAgentEvent])

  return { isConnected, error }
}
