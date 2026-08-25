import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchPage, formatFetchError } from './fetch-trees'

function treePage(): Response {
  return new Response(
    JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 101 },
          geometry: { type: 'Point', coordinates: [24.9384, 60.1699] },
        },
      ],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

test('retries transient network failures three times before succeeding', async () => {
  let attempts = 0
  const delays: number[] = []
  const signals: AbortSignal[] = []
  const dispatchers: unknown[] = []
  const networkError = new TypeError(
    'fetch failed',
    { cause: Object.assign(new Error('connection reset'), { code: 'ECONNRESET' }) },
  )

  const result = await fetchPage(0, {
    fetchImpl: async (_input, init) => {
      attempts += 1
      assert.ok(init?.signal)
      signals.push(init.signal)
      dispatchers.push((init as { dispatcher?: unknown } | undefined)?.dispatcher)

      if (attempts <= 3) {
        throw networkError
      }

      return treePage()
    },
    sleep: async (delayMs) => {
      delays.push(delayMs)
    },
  })

  assert.equal(result.features[0]?.properties.id, 101)
  assert.equal(attempts, 4)
  assert.deepEqual(delays, [1_000, 2_000, 4_000])
  assert.equal(signals.length, 4)
  assert.ok(dispatchers.every(Boolean))
})

test('does not retry a successful HTTP response with invalid data', async () => {
  let attempts = 0

  await assert.rejects(
    fetchPage(0, {
      fetchImpl: async () => {
        attempts += 1
        return new Response(JSON.stringify({ type: 'FeatureCollection', features: {} }), {
          status: 200,
        })
      },
      sleep: async () => {
        throw new Error('sleep should not be called')
      },
    }),
    /FeatureCollection\.features must be an array/,
  )

  assert.equal(attempts, 1)
})

test('aborts and retries a request that exceeds its timeout', async () => {
  let attempts = 0

  await assert.rejects(
    fetchPage(0, {
      requestTimeoutMs: 1,
      fetchImpl: async (_input, init) => {
        attempts += 1
        return new Promise<Response>((_resolve, reject) => {
          const fallbackTimer = setTimeout(
            () => reject(new Error('request was not aborted')),
            50,
          )
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(fallbackTimer)
            reject(init.signal?.reason)
          })
        })
      },
      sleep: async () => {},
    }),
    (error: unknown) => {
      assert.match(formatFetchError(error), /TimeoutError/)
      return true
    },
  )

  assert.equal(attempts, 4)
})

test('reports the final network cause and code after retries are exhausted', async () => {
  const networkError = new TypeError(
    'fetch failed',
    { cause: Object.assign(new Error('temporary DNS failure'), { code: 'EAI_AGAIN' }) },
  )

  await assert.rejects(
    fetchPage(0, {
      fetchImpl: async () => {
        throw networkError
      },
      sleep: async () => {},
    }),
    (error: unknown) => {
      assert.match(formatFetchError(error), /EAI_AGAIN/)
      assert.match(formatFetchError(error), /temporary DNS failure/)
      return true
    },
  )
})
