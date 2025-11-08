import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

const TicketDetailsPage = () => {
  const { id: ticketId } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const token = useMemo(() => localStorage.getItem('token'), [])

  const fetchTicketDetails = useCallback(async () => {
    if (!ticketId) {
      setFetchError('Missing ticket identifier.')
      setTicket(null)
      setIsLoading(false)
      return
    }

    if (!token) {
      setFetchError('Authentication token is missing. Please log in again.')
      setTicket(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/ticket/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null)
        const errorMessage = errorPayload?.error || 'Failed to load ticket details.'
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setTicket(data)
      setFetchError('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load ticket details.'
      setFetchError(message)
      setTicket(null)
    } finally {
      setIsLoading(false)
    }
  }, [ticketId, token])

  useEffect(() => {
    fetchTicketDetails()
  }, [fetchTicketDetails])

  const handleBackClick = () => {
    navigate('/')
  }

  const handleBackKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleBackClick()
    }
  }

  const handleRetryClick = () => {
    fetchTicketDetails()
  }

  const handleRetryKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleRetryClick()
    }
  }

  if (isLoading) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-16'>
        <h1 className='text-2xl font-semibold text-slate-900'>Loading ticket…</h1>
        <p className='text-base text-slate-600'>Fetching the latest details for this ticket.</p>
      </main>
    )
  }

  if (fetchError) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 py-16'>
        <div className='flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm'>
          <h1 className='text-2xl font-semibold text-red-600'>Unable to load ticket</h1>
          <p className='text-center text-base text-slate-600'>{fetchError}</p>
          <button
            type='button'
            onClick={handleRetryClick}
            onKeyDown={handleRetryKeyDown}
            tabIndex={0}
            aria-label='Retry loading ticket details'
            className='rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          >
            Retry
          </button>
        </div>
        <button
          type='button'
          onClick={handleBackClick}
          onKeyDown={handleBackKeyDown}
          tabIndex={0}
          aria-label='Go back to ticket list'
          className='rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        >
          Back to tickets
        </button>
      </main>
    )
  }

  if (!ticket) {
    return (
      <main className='mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-16'>
        <h1 className='text-2xl font-semibold text-slate-900'>Ticket not available</h1>
        <p className='text-base text-slate-600'>Try refreshing the page or returning to the ticket list.</p>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={handleRetryClick}
            onKeyDown={handleRetryKeyDown}
            tabIndex={0}
            aria-label='Reload ticket details'
            className='rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          >
            Refresh
          </button>
          <button
            type='button'
            onClick={handleBackClick}
            onKeyDown={handleBackKeyDown}
            tabIndex={0}
            aria-label='Return to ticket list'
            className='rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          >
            Back to tickets
          </button>
        </div>
      </main>
    )
  }

  const formattedCreatedAt = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Not available'
  const assignedToLabel = ticket.assignedTo?.email || 'Unassigned'
  const statusLabel = ticket.status || 'Unknown'
  const helpfulNotes = ticket.helpfulNotes || 'No helpful notes'

  return (
    <main className='mx-auto min-h-screen w-full max-w-3xl px-4 py-16 bg-white'>
      <div className='flex flex-col gap-8'>
        <div className='flex items-start justify-between'>
          <div className='flex flex-col gap-2'>
            <span className='text-sm font-medium uppercase tracking-wide text-slate-500'>Ticket</span>
            <h1 className='text-3xl font-semibold text-slate-900'>{ticket.title}</h1>
          </div>
          <button
            type='button'
            onClick={handleBackClick}
            onKeyDown={handleBackKeyDown}
            tabIndex={0}
            aria-label='Return to ticket list'
            className='rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          >
            Back to tickets
          </button>
        </div>

        <section className='grid gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm'>
          <article className='grid gap-2'>
            <h2 className='text-sm font-medium uppercase tracking-wide text-slate-500'>Description</h2>
            <p className='text-base text-slate-700'>{ticket.description}</p>
          </article>

          <article className='grid gap-2'>
            <h2 className='text-sm font-medium uppercase tracking-wide text-slate-500'>Status</h2>
            <p className='text-base text-slate-700'>{statusLabel}</p>
          </article>

          <article className='grid gap-2'>
            <h2 className='text-sm font-medium uppercase tracking-wide text-slate-500'>Assigned To</h2>
            <p className='text-base text-slate-700'>{assignedToLabel}</p>
          </article>

          <article className='grid gap-2'>
            <h2 className='text-sm font-medium uppercase tracking-wide text-slate-500'>Created At</h2>
            <p className='text-base text-slate-700'>{formattedCreatedAt}</p>
          </article>

          <article className='grid gap-2 text-base'>
            <h2 className='text-sm font-medium uppercase tracking-wide'>Helpful Notes</h2>
            <div className='prose  max-w-none leading-relaxed'>
              <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                {helpfulNotes}
              </ReactMarkdown>
            </div>
          </article>
        </section>

        <button
          type='button'
          onClick={handleRetryClick}
          onKeyDown={handleRetryKeyDown}
          tabIndex={0}
          aria-label='Refresh ticket details'
          className='w-fit rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        >
          Refresh details
        </button>
      </div>
    </main>
  )
}

export default TicketDetailsPage