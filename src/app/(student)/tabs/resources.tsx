// Resources Screen for CampusHub
// Browse all learning resources - Backend-driven

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Badge from '../../../components/ui/Badge';
import Icon from '../../../components/ui/Icon';
import ErrorState from '../../../components/ui/ErrorState';
import BookmarkButton from '../../../components/resources/BookmarkButton';
import FavoriteButton from '../../../components/resources/FavoriteButton';
import { resourcesAPI, publicAcademicAPI, coursesAPI } from '../../../services/api';
import { resourcesService } from '../../../services/resources.service';
import { bookmarksService } from '../../../services/bookmarks.service';
import { favoritesService } from '../../../services/favorites.service';
import { openNativeShareSheet } from '../../../utils/share';

// Types matching backend response
interface Resource {
  id: string;
  title: string;
  description?: string;
  resource_type: string;
  file_type?: string;
  file_size?: number;
  thumbnail?: string;
  course?: { id: string; name: string; code?: string };
  unit?: { name: string; code?: string };
  average_rating: number;
  download_count: number;
  created_at: string;
  can_share?: boolean;
  is_bookmarked?: boolean;
  is_favorited?: boolean;
  is_pinned?: boolean;
}

interface Faculty {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  faculty_id: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  department_id?: string;
}

interface Unit {
  id: string;
  name: string;
  code: string;
  semester?: number;
  year_of_study?: number;
}

interface AcademicFilters {
  semester: string;
  yearOfStudy: string;
  faculty: string;
  department: string;
  course: string;
  unit: string;
}

const DEFAULT_ACADEMIC_FILTERS: AcademicFilters = {
  semester: '',
  yearOfStudy: '',
  faculty: '',
  department: '',
  course: '',
  unit: '',
};

const resourceTypeOptions = [
  { label: 'All', value: null },
  { label: 'Notes', value: 'notes' },
  { label: 'Past Exam', value: 'past_paper' },
  { label: 'Book', value: 'book' },
  { label: 'Assignment', value: 'assignment' },
  { label: 'Slides', value: 'slides' },
  { label: 'Tutorial', value: 'tutorial' },
] as const;

const formatResourceTypeLabel = (value?: string | null): string => {
  const normalized = String(value || '').trim().toLowerCase();
  const matched = resourceTypeOptions.find((option) => option.value === normalized);
  if (matched) return matched.label;
  return (
    normalized
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Resource'
  );
};

const getResourceTypeVariant = (
  value?: string | null
): 'primary' | 'success' | 'warning' | 'info' => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'tutorial') return 'info';
  if (normalized === 'past_paper') return 'warning';
  if (normalized === 'book') return 'success';
  return 'primary';
};

const ResourcesScreen: React.FC = () => {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AcademicFilters>(
    DEFAULT_ACADEMIC_FILTERS
  );
  const [draftFilters, setDraftFilters] = useState<AcademicFilters>(
    DEFAULT_ACADEMIC_FILTERS
  );
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingAcademicData, setLoadingAcademicData] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const semesters = [
    { id: '1', label: 'Semester 1' },
    { id: '2', label: 'Semester 2' },
  ];
  const yearsOfStudy = ['1', '2', '3', '4', '5', '6', '7'];

  const extractCollection = <T,>(response: any, key: string): T[] => {
    return (
      response?.data?.data?.[key] ||
      response?.data?.data?.results ||
      []
    ) as T[];
  };

  const loadFaculties = useCallback(async () => {
    try {
      setLoadingAcademicData(true);
      const response = await publicAcademicAPI.getFaculties();
      setFaculties(extractCollection<Faculty>(response, 'faculties'));
    } catch (err) {
      console.error('Failed to load faculties:', err);
      setFaculties([]);
    } finally {
      setLoadingAcademicData(false);
    }
  }, []);

  const loadDepartments = useCallback(async (facultyId: string) => {
    if (!facultyId) {
      setDepartments([]);
      return;
    }

    try {
      setLoadingDepartments(true);
      const response = await publicAcademicAPI.getDepartments(facultyId);
      setDepartments(extractCollection<Department>(response, 'departments'));
    } catch (err) {
      console.error('Failed to load departments:', err);
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const loadCourses = useCallback(
    async (departmentId: string, filters?: { semester?: string; yearOfStudy?: string }) => {
      if (!departmentId) {
        setCourses([]);
        return;
      }

      try {
        setLoadingCourses(true);
        const response = await publicAcademicAPI.getCourses(departmentId, {
          semester: filters?.semester,
          yearOfStudy: filters?.yearOfStudy,
        });
        setCourses(extractCollection<Course>(response, 'courses'));
      } catch (err) {
        console.error('Failed to load courses:', err);
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    },
    []
  );

  const loadUnits = useCallback(
    async (courseId: string, filters?: { semester?: string; yearOfStudy?: string }) => {
      if (!courseId) {
        setUnits([]);
        return;
      }

      try {
        setLoadingUnits(true);
        const response = await coursesAPI.getUnits(courseId, {
          semester: filters?.semester,
          yearOfStudy: filters?.yearOfStudy,
        });
        setUnits(extractCollection<Unit>(response, 'units'));
      } catch (err) {
        console.error('Failed to load units:', err);
        setUnits([]);
      } finally {
        setLoadingUnits(false);
      }
    },
    []
  );

  const fetchResources = useCallback(async () => {
    try {
      setError(null);
      const params: any = {
        scope: 'all', // Get all resources from other students
      };
      if (selectedType) {
        params.type = selectedType;
      }
      if (appliedFilters.semester) {
        params.semester = appliedFilters.semester;
      }
      if (appliedFilters.yearOfStudy) {
        params.year_of_study = appliedFilters.yearOfStudy;
      }
      if (appliedFilters.faculty) {
        params.faculty = appliedFilters.faculty;
      }
      if (appliedFilters.department) {
        params.department = appliedFilters.department;
      }
      if (appliedFilters.course) {
        params.course = appliedFilters.course;
      }
      if (appliedFilters.unit) {
        params.unit = appliedFilters.unit;
      }
      
      const response = await resourcesAPI.list(params);
      const data = response.data.data;
      
      const resourcesList = data.resources || data.results || [];
      // Sort by pinned status (pinned first), then by created_at
      const sortedResources = [...resourcesList].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setResources(sortedResources);
    } catch (err: any) {
      console.error('Failed to fetch resources:', err);
      setError(err.response?.data?.message || 'Failed to load resources');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType, appliedFilters]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    loadFaculties();
  }, [loadFaculties]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResources();
  }, [fetchResources]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchResources();
  }, [fetchResources]);

  const resetDraftCourseAndUnit = () => {
    setCourses([]);
    setUnits([]);
    setDraftFilters((current) => ({
      ...current,
      course: '',
      unit: '',
    }));
  };

  const openFilterModal = useCallback(async () => {
    const nextDraft = { ...appliedFilters };
    setDraftFilters(nextDraft);
    setShowFilters(true);

    if (!faculties.length) {
      await loadFaculties();
    }

    if (!nextDraft.faculty) {
      setDepartments([]);
      setCourses([]);
      setUnits([]);
      return;
    }

    await loadDepartments(nextDraft.faculty);

    if (!nextDraft.department) {
      setCourses([]);
      setUnits([]);
      return;
    }

    if (nextDraft.semester && nextDraft.yearOfStudy) {
      await loadCourses(nextDraft.department, {
        semester: nextDraft.semester,
        yearOfStudy: nextDraft.yearOfStudy,
      });
    } else {
      setCourses([]);
    }

    if (!nextDraft.course || !nextDraft.semester || !nextDraft.yearOfStudy) {
      setUnits([]);
      return;
    }

    await loadUnits(nextDraft.course, {
      semester: nextDraft.semester,
      yearOfStudy: nextDraft.yearOfStudy,
    });
  }, [appliedFilters, faculties.length, loadCourses, loadDepartments, loadFaculties, loadUnits]);

  const handleDraftSemesterSelect = async (semester: string) => {
    const nextFilters = {
      ...draftFilters,
      semester,
      course: '',
      unit: '',
    };
    setDraftFilters(nextFilters);
    setCourses([]);
    setUnits([]);

    if (nextFilters.department && nextFilters.yearOfStudy) {
      await loadCourses(nextFilters.department, {
        semester,
        yearOfStudy: nextFilters.yearOfStudy,
      });
    }
  };

  const handleDraftYearSelect = async (yearOfStudy: string) => {
    const nextFilters = {
      ...draftFilters,
      yearOfStudy,
      course: '',
      unit: '',
    };
    setDraftFilters(nextFilters);
    setCourses([]);
    setUnits([]);

    if (nextFilters.department && nextFilters.semester) {
      await loadCourses(nextFilters.department, {
        semester: nextFilters.semester,
        yearOfStudy,
      });
    }
  };

  const handleDraftFacultySelect = async (facultyId: string) => {
    setDraftFilters((current) => ({
      ...current,
      faculty: facultyId,
      department: '',
      course: '',
      unit: '',
    }));
    setDepartments([]);
    setCourses([]);
    setUnits([]);
    await loadDepartments(facultyId);
  };

  const handleDraftDepartmentSelect = async (departmentId: string) => {
    const nextFilters = {
      ...draftFilters,
      department: departmentId,
      course: '',
      unit: '',
    };
    setDraftFilters(nextFilters);
    setCourses([]);
    setUnits([]);

    if (nextFilters.semester && nextFilters.yearOfStudy) {
      await loadCourses(departmentId, {
        semester: nextFilters.semester,
        yearOfStudy: nextFilters.yearOfStudy,
      });
    }
  };

  const handleDraftCourseSelect = async (courseId: string) => {
    const nextFilters = {
      ...draftFilters,
      course: courseId,
      unit: '',
    };
    setDraftFilters(nextFilters);
    setUnits([]);

    if (nextFilters.semester && nextFilters.yearOfStudy) {
      await loadUnits(courseId, {
        semester: nextFilters.semester,
        yearOfStudy: nextFilters.yearOfStudy,
      });
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setShowFilters(false);
    setLoading(true);
  };

  const handleClearDraftFilters = () => {
    setDraftFilters({ ...DEFAULT_ACADEMIC_FILTERS });
    setDepartments([]);
    setCourses([]);
    setUnits([]);
  };

  const handleClearAppliedFilters = () => {
    setAppliedFilters({ ...DEFAULT_ACADEMIC_FILTERS });
    setDraftFilters({ ...DEFAULT_ACADEMIC_FILTERS });
    setDepartments([]);
    setCourses([]);
    setUnits([]);
    setLoading(true);
  };

  const getOptionLabel = (
    options: Array<{ id: string; name: string; code?: string }>,
    id: string
  ) => {
    const match = options.find((option) => option.id === id);
    return match ? match.code || match.name : '';
  };

  const activeFilterLabels = [
    appliedFilters.semester ? `Semester ${appliedFilters.semester}` : '',
    appliedFilters.yearOfStudy ? `Year ${appliedFilters.yearOfStudy}` : '',
    appliedFilters.faculty ? getOptionLabel(faculties, appliedFilters.faculty) : '',
    appliedFilters.department ? getOptionLabel(departments, appliedFilters.department) : '',
    appliedFilters.course ? getOptionLabel(courses, appliedFilters.course) : '',
    appliedFilters.unit ? getOptionLabel(units, appliedFilters.unit) : '',
  ].filter(Boolean);

  const getResourceTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'notes': return colors.primary[500];
      case 'past_exam':
      case 'past exam': 
      case 'past_paper':
      case 'past paper': return colors.warning;
      case 'slides': return colors.info;
      case 'lab_report':
      case 'lab report': return colors.success;
      case 'book': return colors.accent[500];
      case 'assignment': return colors.error;
      default: return colors.primary[500];
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  const handleShareResource = async (item: Resource) => {
    try {
      const payload = await resourcesService.getResourceShareLink(item.id);
      if (!payload.can_share) {
        Alert.alert('Not Shareable', payload.reason || 'This resource cannot be shared.');
        return;
      }
      const shared = await openNativeShareSheet({
        title: payload.title,
        message: payload.share_message,
        url: payload.share_url,
      });
      if (shared) {
        await resourcesService.recordResourceShare(item.id, 'native_share');
      }
    } catch (err: any) {
      Alert.alert(
        'Share Error',
        err?.response?.data?.detail || err?.message || 'Failed to share resource'
      );
    }
  };

  const toggleBookmark = async (resourceId: string) => {
    await bookmarksService.toggleResourceBookmark(resourceId);
    setResources(prev =>
      prev.map(item =>
        item.id === resourceId
          ? { ...item, is_bookmarked: !item.is_bookmarked }
          : item
      )
    );
  };

  const toggleFavorite = async (resourceId: string) => {
    await favoritesService.toggleResourceFavorite(resourceId);
    setResources(prev =>
      prev.map(item =>
        item.id === resourceId
          ? { ...item, is_favorited: !item.is_favorited }
          : item
      )
    );
  };

  const selectedTypeLabel =
    resourceTypeOptions.find((resourceType) => resourceType.value === selectedType)?.label ||
    'All';

  const renderItem = ({ item }: { item: Resource }) => (
    <TouchableOpacity
      style={styles.resourceCard}
      onPress={() => router.push(`/(student)/resource/${item.id}`)}
    >
      <View style={styles.resourceHeader}>
        <View style={styles.resourceHeaderLeft}>
          <Badge
            label={formatResourceTypeLabel(item.resource_type)}
            variant={getResourceTypeVariant(item.resource_type)}
          />
          {item.is_pinned && (
            <View style={[styles.pinnedBadge, { backgroundColor: colors.primary[500] + '20' }]}>
              <Icon name="pin" size={10} color={colors.primary[500]} />
              <Text style={[styles.pinnedText, { color: colors.primary[500] }]}>Pinned</Text>
            </View>
          )}
        </View>
        <View style={styles.resourceHeaderActions}>
          <Text style={styles.resourceRating}>⭐ {item.average_rating?.toFixed(1) || '0.0'}</Text>
          <FavoriteButton
            isFavorited={Boolean(item.is_favorited)}
            onPress={() => toggleFavorite(item.id)}
          />
          <BookmarkButton
            isBookmarked={Boolean(item.is_bookmarked)}
            onPress={() => toggleBookmark(item.id)}
          />
          <TouchableOpacity onPress={() => handleShareResource(item)} style={styles.shareIconBtn}>
            <Icon name="share-social" size={16} color={colors.success} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.resourceTitle}>{item.title}</Text>
      <View style={styles.resourceMeta}>
        <Text style={styles.resourceCourse}>{item.course?.name || 'General'}</Text>
        {!!item.unit?.code && (
          <>
            <Text style={styles.resourceDot}>•</Text>
            <Text style={styles.resourceUnitCode}>{item.unit.code}</Text>
          </>
        )}
        {item.created_at && (
          <>
            <Text style={styles.resourceDot}>•</Text>
            <Text style={styles.resourceYear}>{new Date(item.created_at).getFullYear()}</Text>
          </>
        )}
      </View>
      {!!item.unit?.name && (
        <Text style={styles.resourceUnitName} numberOfLines={1}>
          {item.unit.name}
        </Text>
      )}
      <View style={styles.resourceFooter}>
        <View style={styles.resourceStat}>
          <Icon name="download" size={14} color={colors.text.tertiary} />
          <Text style={styles.resourceStatText}>{item.download_count || 0}</Text>
        </View>
        <View style={styles.resourceStat}>
          <Icon name="document" size={14} color={colors.text.tertiary} />
          <Text style={styles.resourceStatText}>{formatFileSize(item.file_size)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Error state
  if (error && resources.length === 0) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={resources}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Resources</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => void openFilterModal()}
              >
                <Icon name="filter" size={20} color={colors.text.secondary} />
                {activeFilterLabels.length > 0 && <View style={styles.filterBadge} />}
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TouchableOpacity
              style={styles.searchBar}
              onPress={() => router.push('/(student)/search')}
            >
              <Icon name="search" size={20} color={colors.text.tertiary} />
              <Text style={styles.searchPlaceholder}>Search resources...</Text>
            </TouchableOpacity>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {resourceTypeOptions.map((resourceType) => (
                <TouchableOpacity 
                  key={resourceType.label}
                  style={[
                    styles.chip, 
                    selectedType === resourceType.value && styles.chipActive
                  ]}
                  onPress={() => setSelectedType(resourceType.value)}
                >
                  <Text style={[
                    styles.chipText, 
                    selectedType === resourceType.value && styles.chipTextActive
                  ]}>
                    {resourceType.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {activeFilterLabels.length > 0 && (
              <>
                <View style={styles.activeFiltersHeader}>
                  <Text style={styles.activeFiltersTitle}>Academic Filters</Text>
                  <TouchableOpacity onPress={handleClearAppliedFilters}>
                    <Text style={styles.clearFiltersText}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.activeFiltersScroll}
                >
                  {activeFilterLabels.map((label) => (
                    <View key={label} style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterChipText}>{label}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.sectionTitle}>
              {selectedTypeLabel} Resources ({resources.length})
            </Text>
          </>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="document-text" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Resources Found</Text>
            <Text style={styles.emptyText}>
              {selectedType || activeFilterLabels.length > 0
                ? 'No resources match the current filters'
                : 'No resources available yet'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      />

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Resources</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Icon name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Semester</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChips}>
                  {semesters.map((semester) => (
                    <TouchableOpacity
                      key={semester.id}
                      style={[
                        styles.chip,
                        draftFilters.semester === semester.id && styles.chipActive,
                      ]}
                      onPress={() => void handleDraftSemesterSelect(semester.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          draftFilters.semester === semester.id && styles.chipTextActive,
                        ]}
                      >
                        {semester.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Year of Study</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChips}>
                  {yearsOfStudy.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.chip,
                        draftFilters.yearOfStudy === year && styles.chipActive,
                      ]}
                      onPress={() => void handleDraftYearSelect(year)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          draftFilters.yearOfStudy === year && styles.chipTextActive,
                        ]}
                      >
                        {`Year ${year}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Faculty</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChips}>
                  {faculties.map((faculty) => (
                    <TouchableOpacity
                      key={faculty.id}
                      style={[
                        styles.chip,
                        draftFilters.faculty === faculty.id && styles.chipActive,
                      ]}
                      onPress={() => void handleDraftFacultySelect(faculty.id)}
                      disabled={loadingAcademicData}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          draftFilters.faculty === faculty.id && styles.chipTextActive,
                        ]}
                      >
                        {faculty.code || faculty.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {loadingAcademicData && (
                  <Text style={styles.filterHelperText}>Loading faculties...</Text>
                )}
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChips}>
                  {departments.map((department) => (
                    <TouchableOpacity
                      key={department.id}
                      style={[
                        styles.chip,
                        draftFilters.department === department.id && styles.chipActive,
                      ]}
                      onPress={() => void handleDraftDepartmentSelect(department.id)}
                      disabled={!draftFilters.faculty || loadingDepartments}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          draftFilters.department === department.id && styles.chipTextActive,
                        ]}
                      >
                        {department.code || department.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {!draftFilters.faculty && (
                  <Text style={styles.filterHelperText}>Select a faculty first.</Text>
                )}
                {draftFilters.faculty && loadingDepartments && (
                  <Text style={styles.filterHelperText}>Loading departments...</Text>
                )}
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Course</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChips}>
                  {courses.map((course) => (
                    <TouchableOpacity
                      key={course.id}
                      style={[
                        styles.chip,
                        draftFilters.course === course.id && styles.chipActive,
                      ]}
                      onPress={() => void handleDraftCourseSelect(course.id)}
                      disabled={
                        !draftFilters.department ||
                        !draftFilters.semester ||
                        !draftFilters.yearOfStudy ||
                        loadingCourses
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          draftFilters.course === course.id && styles.chipTextActive,
                        ]}
                      >
                        {course.code || course.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {!draftFilters.department && (
                  <Text style={styles.filterHelperText}>Select a department first.</Text>
                )}
                {draftFilters.department &&
                  (!draftFilters.semester || !draftFilters.yearOfStudy) && (
                  <Text style={styles.filterHelperText}>
                    Select semester and year of study first.
                  </Text>
                )}
                {draftFilters.department && loadingCourses && (
                  <Text style={styles.filterHelperText}>Loading courses...</Text>
                )}
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Unit</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChips}>
                  {units.map((unit) => (
                    <TouchableOpacity
                      key={unit.id}
                      style={[
                        styles.chip,
                        draftFilters.unit === unit.id && styles.chipActive,
                      ]}
                      onPress={() =>
                        setDraftFilters((current) => ({ ...current, unit: unit.id }))
                      }
                      disabled={!draftFilters.course || loadingUnits}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          draftFilters.unit === unit.id && styles.chipTextActive,
                        ]}
                      >
                        {unit.code || unit.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {!draftFilters.course && (
                  <Text style={styles.filterHelperText}>Select a course first.</Text>
                )}
                {draftFilters.course && loadingUnits && (
                  <Text style={styles.filterHelperText}>Loading units...</Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={handleClearDraftFilters}>
                <Text style={styles.modalSecondaryButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleApplyFilters}>
                <Text style={styles.modalPrimaryButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    paddingBottom: spacing[10],
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card.light,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  filterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[6],
    ...shadows.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: colors.text.tertiary,
    marginLeft: spacing[3],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  chipsScroll: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  activeFiltersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  activeFiltersTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
  },
  activeFiltersScroll: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  activeFilterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary[600],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  chipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.inverse,
  },
  resourceCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.md,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  resourceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  resourceHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  resourceRating: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  shareIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success + '15',
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
    lineHeight: 22,
  },
  resourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  resourceCourse: {
    fontSize: 13,
    color: colors.primary[600],
    fontWeight: '500',
  },
  resourceUnitCode: {
    fontSize: 13,
    color: colors.accent[500],
    fontWeight: '700',
  },
  resourceDot: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginHorizontal: spacing[2],
  },
  resourceYear: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  resourceUnitName: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: spacing[3],
  },
  resourceFooter: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  resourceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  resourceStatText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalContent: {
    padding: spacing[5],
    paddingBottom: spacing[8],
    gap: spacing[5],
  },
  filterSection: {
    gap: spacing[2],
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  filterHelperText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  modalChips: {
    gap: spacing[2],
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  modalSecondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.card.light,
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  modalPrimaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.inverse,
  },
});

export default ResourcesScreen;
