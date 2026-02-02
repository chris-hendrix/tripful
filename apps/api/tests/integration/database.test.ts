import { describe, it, expect } from 'vitest'
import { testConnection } from '@/config/database.js'
import { testPool } from '../setup.js'

describe('Database Connection', () => {
  it('should connect to PostgreSQL successfully', async () => {
    const connected = await testConnection()
    expect(connected).toBe(true)
  })

  it('should execute SELECT 1 query', async () => {
    const result = await testPool.query('SELECT 1 as result')
    expect(result.rows[0]?.result).toBe(1)
  })

  it('should get current timestamp', async () => {
    const result = await testPool.query('SELECT NOW() as now')
    expect(result.rows[0]?.now).toBeInstanceOf(Date)
  })
})
