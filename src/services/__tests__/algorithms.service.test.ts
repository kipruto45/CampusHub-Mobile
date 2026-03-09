import {
  collectionAlgorithms,
  folderAlgorithms,
  searchAlgorithms,
} from '../algorithms.service';

describe('algorithms.service', () => {
  it('ranks exact title matches ahead of partial and duplicate results', () => {
    const ranked = searchAlgorithms.rankResources(
      [
        {
          id: '1',
          title: 'Data Structures',
          download_count: 10,
          created_at: '2026-03-01T10:00:00.000Z',
        },
        {
          id: '2',
          title: 'Advanced Data Structures Notes',
          download_count: 200,
          created_at: '2026-03-02T10:00:00.000Z',
        },
        {
          id: '1',
          title: 'Data Structures Duplicate',
          download_count: 999,
          created_at: '2026-03-03T10:00:00.000Z',
        },
      ],
      'Data Structures'
    );

    expect(ranked).toHaveLength(2);
    expect(ranked[0].id).toBe('1');
    expect(ranked[1].id).toBe('2');
  });

  it('merges suggestions without duplicates and keeps recents', () => {
    const merged = searchAlgorithms.mergeSuggestions(
      [
        { value: 'Data Structures', type: 'title' },
        { value: 'CSC 201', type: 'course' },
      ],
      [{ query: 'Algorithms' }]
    );

    expect(merged).toEqual([
      { value: 'Data Structures', type: 'title' },
      { value: 'CSC 201', type: 'course' },
      { value: 'Algorithms', type: 'recent' },
    ]);
  });

  it('builds breadcrumbs from folder ancestry', () => {
    const breadcrumbs = folderAlgorithms.buildBreadcrumbs('3', [
      { id: '1', name: 'Semester 1', parent: null },
      { id: '2', name: 'Data Structures', parent: '1' },
      { id: '3', name: 'Trees', parent: '2' },
    ]);

    expect(breadcrumbs.map((item) => item.name)).toEqual([
      'Semester 1',
      'Data Structures',
      'Trees',
    ]);
  });

  it('blocks moving a folder into itself or a descendant', () => {
    const folders = [
      { id: '1', name: 'Semester 1', parent: null },
      { id: '2', name: 'Data Structures', parent: '1' },
      { id: '3', name: 'Trees', parent: '2' },
    ];

    expect(folderAlgorithms.validateMove('2', '2', folders)).toEqual({
      valid: false,
      reason: 'A folder cannot be moved into itself.',
    });
    expect(folderAlgorithms.validateMove('2', '3', folders)).toEqual({
      valid: false,
      reason: 'A folder cannot be moved into one of its descendants.',
    });
    expect(folderAlgorithms.validateMove('2', null, folders)).toEqual({
      valid: true,
    });
  });

  it('generates duplicate-safe folder names', () => {
    expect(
      folderAlgorithms.generateDuplicateSafeName('Notes', ['Notes', 'Notes (2)', 'Projects'])
    ).toBe('Notes (3)');
  });

  it('deduplicates collections by key', () => {
    const items = collectionAlgorithms.uniqueBy(
      [
        { id: '1', label: 'A' },
        { id: '1', label: 'A copy' },
        { id: '2', label: 'B' },
      ],
      (item) => item.id
    );

    expect(items).toEqual([
      { id: '1', label: 'A' },
      { id: '2', label: 'B' },
    ]);
  });
});
