import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { coverPalette, TEASER } from '../src/components/3d/materials.js'

describe('coverPalette', () => {
  it('edisi monthly memakai ungu dalam, reguler sage', () => {
    assert.equal(coverPalette('journaling', 'monthly').bg, '#4b3f8f')
    assert.equal(coverPalette('pure', 'regular').bg, '#3f6b5c')
  })

  it('label konten: journaling vs murni', () => {
    assert.equal(coverPalette('journaling', 'monthly').label, 'Journaling')
    assert.equal(coverPalette('pure', 'monthly').label, 'Murni')
  })

  it('journaling diberi warna aksen, murni tidak', () => {
    assert.ok(coverPalette('journaling', 'monthly').accent)
    assert.equal(coverPalette('pure', 'regular').accent, undefined)
  })
})

describe('TEASER', () => {
  it('bahan teaser realistis: linen, kulit, baja, halaman, charm', () => {
    assert.equal(TEASER.fabric, '#a9c0d8')
    assert.equal(TEASER.leather, '#7d6c58')
    assert.equal(TEASER.steel, '#bcc0c4')
    assert.equal(TEASER.page, '#f1ede2')
    assert.ok(TEASER.pen && TEASER.highlighter)
  })
})
