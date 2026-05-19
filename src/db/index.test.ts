import { describe, expect, it } from 'vitest'

import { db } from './index'

describe('database schema', () => {
  it('uses a schema version that can migrate existing databases to AI plan items', () => {
    expect(db.verno).toBe(4)
  })
})
