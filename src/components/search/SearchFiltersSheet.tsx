import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SearchFilters } from '../../services/search.service';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { BottomSheet } from '../ui/BottomSheet';

interface SearchFiltersSheetProps {
  visible: boolean;
  filters: SearchFilters;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
  onReset: () => void;
}

type Option = { label: string; value: string };

const resourceTypeOptions: Option[] = [
  { label: 'All Types', value: '' },
  { label: 'Notes', value: 'notes' },
  { label: 'Books', value: 'book' },
  { label: 'Past Papers', value: 'past_paper' },
  { label: 'Slides', value: 'slides' },
  { label: 'Tutorials', value: 'tutorial' },
  { label: 'Assignments', value: 'assignment' },
];

const fileTypeOptions: Option[] = [
  { label: 'All Files', value: '' },
  { label: 'PDF', value: 'pdf' },
  { label: 'DOCX', value: 'docx' },
  { label: 'PPTX', value: 'pptx' },
  { label: 'TXT', value: 'txt' },
  { label: 'ZIP', value: 'zip' },
];

const sortOptions: Option[] = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Most Downloaded', value: 'most_downloaded' },
  { label: 'Highest Rated', value: 'highest_rated' },
  { label: 'Most Viewed', value: 'most_viewed' },
  { label: 'Most Favorited', value: 'most_favorited' },
];

const FilterRow: React.FC<{
  title: string;
  options: Option[];
  selected: string;
  onSelect: (value: string) => void;
}> = ({ title, options, selected, onSelect }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.optionsWrap}>
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <TouchableOpacity
            key={`${title}-${option.value || 'all'}`}
            style={[styles.chip, active ? styles.chipActive : null]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const SearchFiltersSheet: React.FC<SearchFiltersSheetProps> = ({
  visible,
  filters,
  onClose,
  onApply,
  onReset,
}) => {
  const [draft, setDraft] = useState<SearchFilters>(filters);

  const summary = useMemo(() => {
    const count = Object.values(draft).filter((value) => value !== undefined && value !== '').length;
    return count;
  }, [draft]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Search Filters">
      <ScrollView showsVerticalScrollIndicator={false}>
        <FilterRow
          title="Resource Type"
          options={resourceTypeOptions}
          selected={String(draft.resource_type || '')}
          onSelect={(value) => setDraft((prev) => ({ ...prev, resource_type: value || undefined }))}
        />
        <FilterRow
          title="File Type"
          options={fileTypeOptions}
          selected={String(draft.file_type || '')}
          onSelect={(value) => setDraft((prev) => ({ ...prev, file_type: value || undefined }))}
        />
        <FilterRow
          title="Sort"
          options={sortOptions}
          selected={String(draft.sort || 'relevance')}
          onSelect={(value) => setDraft((prev) => ({ ...prev, sort: value as SearchFilters['sort'] }))}
        />
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.resetButton} onPress={() => { setDraft({ sort: 'relevance' }); onReset(); }}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => {
            onApply(draft);
            onClose();
          }}
        >
          <Text style={styles.applyText}>{summary > 0 ? `Apply (${summary})` : 'Apply'}</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing[5],
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  chipActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  chipText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[3],
    paddingBottom: spacing[2],
  },
  resetButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card.light,
  },
  resetText: {
    fontWeight: '600',
    color: colors.text.secondary,
  },
  applyButton: {
    flex: 2,
    minHeight: 46,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
  },
  applyText: {
    color: colors.text.inverse,
    fontWeight: '700',
  },
});

export default SearchFiltersSheet;
