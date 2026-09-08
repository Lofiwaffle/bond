export const PIXEL_FACE_SIZE = 16

/** Pixel keys: . empty, s stroke, f fill, i ink, d mouth, p heart/tongue. */
export const PIXEL_FACE_MAPS: Record<1 | 2 | 3 | 4 | 5, string[]> = {
  1: [
    '................',
    '..ssssssssssss..',
    '.sffffffffffffs.',
    'sffffffffffffffs',
    'sffiifffffffiifs',
    'sfffiifffffiiffs',
    'sffffffffffffffs',
    'sfffiiffffiifffs',
    'sfffiiffffiifffs',
    'sffffffffffffffs',
    'sffffiifffiifffs',
    'sfffffiiiiiffffs',
    'sffffffffffffffs',
    'sffffffffffffffs',
    '.sffffffffffffs.',
    '..ssssssssssss..',
  ],
  2: [
    '................',
    '..ssssssssssss..',
    '.sffffffffffffs.',
    'sffffffffffffffs',
    'sffffiifffiifffs',
    'sfffiifffffiiffs',
    'sffiifffffffiifs',
    'sffffffffffffffs',
    'sfffiiffffiifffs',
    'sfffiiffffiifffs',
    'sffffffffffffffs',
    'sffffiifffiifffs',
    'sfffffiiiiiffffs',
    'sffffffffffffffs',
    '.sffffffffffffs.',
    '..ssssssssssss..',
  ],
  3: [
    '................',
    '..ssssssssssss..',
    '.sffffffffffffs.',
    'sffffffffffffffs',
    'sffffffffffffffs',
    'sffffffffffffffs',
    'sfffiiffffiifffs',
    'sfffiiffffiifffs',
    'sffffffffffffffs',
    'sffffffffffffffs',
    'sffffiiiiiiifffs',
    'sffffffffffffffs',
    'sffffffffffffffs',
    'sffffffffffffffs',
    '.sffffffffffffs.',
    '..ssssssssssss..',
  ],
  4: [
    '................',
    '..ssssssssssss..',
    '.sffffffffffffs.',
    'sffffffffffffffs',
    'sffffffffffffffs',
    'sfffiiffffiifffs',
    'sfffiiffffiifffs',
    'sffffffffffffffs',
    'sffffffffffffffs',
    'sffffiifffiifffs',
    'sfffffiiiiiffffs',
    'sffffiifffiifffs',
    'sffffffffffffffs',
    'sffffffffffffffs',
    '.sffffffffffffs.',
    '..ssssssssssss..',
  ],
  5: [
    '................',
    '..ssssssssssss..',
    '.sffffffffffffs.',
    'sffffffffffffffs',
    'sffpfpffffpfpffs',
    'sfpppppffpppppfs',
    'sffpppffffpppffs',
    'sfffppffffppfffs',
    'sffffpffffpffffs',
    'sffffffffffffffs',
    'sfffddddddddfffs',
    'sfffdppppppdfffs',
    'sffffddddddffffs',
    'sffffffffffffffs',
    '.sffffffffffffs.',
    '..ssssssssssss..',
  ],
}

export function pixelFaceMaps(): Record<1 | 2 | 3 | 4 | 5, string[]> {
  return PIXEL_FACE_MAPS
}

export function pixelFaceIsValid(
  maps: Record<1 | 2 | 3 | 4 | 5, string[]> = PIXEL_FACE_MAPS,
): boolean {
  return ([1, 2, 3, 4, 5] as const).every((score) => {
    const rows = maps[score]
    return (
      rows.length === PIXEL_FACE_SIZE &&
      rows.every((row) => row.length === PIXEL_FACE_SIZE && /^[.sfidp]+$/.test(row))
    )
  })
}
