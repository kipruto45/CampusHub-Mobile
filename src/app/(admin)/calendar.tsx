// Calendar Management for CampusHub Admin
// Admin panel for managing academic calendars, timetables, and calendar sync

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import { calendarAdminAPI } from '../../services/api';

type CalendarTab = 'calendars' | 'timetables' | 'overrides' | 'schedules' | 'exports' | 'accounts' | 'sync' | 'events';

interface AcademicCalendar {
  id: string;
  name: string;
  faculty_name?: string;
  department_name?: string;
  year: string;
  semester: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface Timetable {
  id: string;
  academic_calendar_name?: string;
  course_name?: string;
  unit_code?: string;
  day: string;
  start_time: string;
  end_time: string;
  type: string;
  building?: string;
  room?: string;
  instructor_name?: string;
}

interface TimetableOverride {
  id: string;
  timetable_info: string;
  date: string;
  override_type: string;
  reason?: string;
  notify_students: boolean;
}

interface PersonalSchedule {
  id: string;
  user_name: string;
  title: string;
  category: string;
  date: string;
  start_time?: string;
  end_time?: string;
  is_all_day: boolean;
}

interface ScheduleExport {
  id: string;
  user_name: string;
  export_type: string;
  sync_enabled: boolean;
  last_sync?: string;
}

interface CalendarAccount {
  id: string;
  user_name: string;
  provider: string;
  email: string;
  sync_enabled: boolean;
  is_active: boolean;
  last_sync_at?: string;
}

interface SyncSettings {
  id: string;
  user_name: string;
  auto_sync: boolean;
  sync_interval_minutes: number;
  sync_direction: string;
}

interface SyncedEvent {
  id: string;
  title: string;
  calendar_account_info: string;
  start_time: string;
  end_time: string;
  is_deleted: boolean;
}

interface CalendarOverview {
  calendars: number;
  timetables: number;
  overrides: number;
  schedules: number;
  exports: number;
  accounts: number;
  sync: number;
  events: number;
}

const EMPTY_OVERVIEW: CalendarOverview = {
  calendars: 0,
  timetables: 0,
  overrides: 0,
  schedules: 0,
  exports: 0,
  accounts: 0,
  sync: 0,
  events: 0,
};

const unwrapEnvelopeData = <T,>(response: any, fallback: T): T => {
  if (response?.data?.data !== undefined) {
    return response.data.data as T;
  }
  if (response?.data !== undefined) {
    return response.data as T;
  }
  return fallback;
};

const CalendarManagementScreen: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CalendarTab>('calendars');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [overview, setOverview] = useState<CalendarOverview>(EMPTY_OVERVIEW);

  // Data states
  const [calendars, setCalendars] = useState<AcademicCalendar[]>([]);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [schedules, setSchedules] = useState<PersonalSchedule[]>([]);
  const [exports, setExports] = useState<ScheduleExport[]>([]);
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [syncSettings, setSyncSettings] = useState<SyncSettings[]>([]);
  const [events, setEvents] = useState<SyncedEvent[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const [
        calendarsRes,
        timetablesRes,
        overridesRes,
        schedulesRes,
        exportsRes,
        accountsRes,
        syncRes,
        eventsRes,
      ] = await Promise.all([
        calendarAdminAPI.listAcademicCalendars({ page: 1, page_size: 1 }),
        calendarAdminAPI.listTimetables({ page: 1, page_size: 1 }),
        calendarAdminAPI.listTimetableOverrides({ page: 1, page_size: 1 }),
        calendarAdminAPI.listPersonalSchedules({ page: 1, page_size: 1 }),
        calendarAdminAPI.listScheduleExports({ page: 1, page_size: 1 }),
        calendarAdminAPI.listCalendarAccounts({ page: 1, page_size: 1 }),
        calendarAdminAPI.listSyncSettings({ page: 1, page_size: 1 }),
        calendarAdminAPI.listSyncedEvents({ page: 1, page_size: 1 }),
      ]);

      const getCount = (response: any) =>
        Number(unwrapEnvelopeData<any>(response, { count: 0 })?.count || 0);

      setOverview({
        calendars: getCount(calendarsRes),
        timetables: getCount(timetablesRes),
        overrides: getCount(overridesRes),
        schedules: getCount(schedulesRes),
        exports: getCount(exportsRes),
        accounts: getCount(accountsRes),
        sync: getCount(syncRes),
        events: getCount(eventsRes),
      });
    } catch (overviewError) {
      console.error('Failed to fetch calendar overview:', overviewError);
    }
  }, []);

  const fetchData = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      setError(null);
      
      const params = { page: pageNum, page_size: 20 };
      let response: any;
      let data: any;

      switch (activeTab) {
        case 'calendars':
          response = await calendarAdminAPI.listAcademicCalendars(params);
          data = unwrapEnvelopeData(response, { results: [], next: null, count: 0 });
          const calendarResults = data?.results || [];
          if (isRefresh || pageNum === 1) {
            setCalendars(calendarResults);
          } else {
            setCalendars(prev => [...prev, ...calendarResults]);
          }
          setHasMore(!!data?.next);
          break;

        case 'timetables':
          response = await calendarAdminAPI.listTimetables(params);
          data = unwrapEnvelopeData(response, { results: [], next: null, count: 0 });
          const timetableResults = data?.results || [];
          if (isRefresh || pageNum === 1) {
            setTimetables(timetableResults);
          } else {
            setTimetables(prev => [...prev, ...timetableResults]);
          }
          setHasMore(!!data?.next);
          break;

        case 'overrides':
          response = await calendarAdminAPI.listTimetableOverrides(params);
          data = unwrapEnvelopeData(response, { results: [], next: null, count: 0 });
          const overrideResults = data?.results || [];
          if (isRefresh || pageNum === 1) {
            setOverrides(overrideResults);
          } else {
            setOverrides(prev => [...prev, ...overrideResults]);
          }
          setHasMore(!!data?.next);
          break;

        case 'schedules':
          response = await calendarAdminAPI.listPersonalSchedules(params);
          data = unwrapEnvelopeData(response, { results: [], next: null, count: 0 });
          const scheduleResults = data?.results || [];
          if (isRefresh || pageNum === 1) {
            setSchedules(scheduleResults);
          } else {
            setSchedules(prev => [...prev, ...scheduleResults]);
          }
          setHasMore(!!data?.next);
          break;

        case 'exports':
          response = await calendarAdminAPI.listScheduleExports(params);
          data = unwrapEnvelopeData(response, { results: [], next: null, count: 0 });
          const exportResults = data?.results || [];
          if (isRefresh || pageNum === 1) {
            setExports(exportResults);
          } else {
            setExports(prev => [...prev, ...exportResults]);
          }
          setHasMore(!!data?.next);
          break;

        case 'accounts':
          response = await calendarAdminAPI.listCalendarAccounts(params);
          data = unwrapEnvelopeData(response, { results: [], next: null, count: 0 });
          const accountResults = data?.results || [];
          if (isRefresh || pageNum === 1) {
            setAccounts(accountResults);
          } else {
            setAccounts(prev => [...prev, ...accountResults]);
          }
          setHasMore(!!data?.next);
          break;

        case 'sync':
          response = await calendarAdminAPI.listSyncSettings(params);
          data = unwrapEnvelopeData(response, { results: [], next: null, count: 0 });
          const syncResults = data?.results || [];
          if (isRefresh || pageNum === 1) {
            setSyncSettings(syncResults);
          } else {
            setSyncSettings(prev => [...prev, ...syncResults]);
          }
          setHasMore(!!data?.next);
          break;

        case 'events':
          response = await calendarAdminAPI.listSyncedEvents(params);
          data = unwrapEnvelopeData(response, { results: [], next: null, count: 0 });
          const eventResults = data?.results || [];
          if (isRefresh || pageNum === 1) {
            setEvents(eventResults);
          } else {
            setEvents(prev => [...prev, ...eventResults]);
          }
          setHasMore(!!data?.next);
          break;
      }

      setPage(pageNum);
      if (pageNum === 1) {
        void fetchOverview();
      }
    } catch (err: any) {
      console.error('Failed to fetch calendar data:', err);
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, fetchOverview]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setSearchQuery('');
    fetchData(1, true);
  }, [activeTab, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(1, true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchData(page + 1);
    }
  };

  const handleDelete = async (id: string, type: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete this ${type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              switch (type) {
                case 'calendar':
                  await calendarAdminAPI.deleteAcademicCalendar(id);
                  break;
                case 'timetable':
                  await calendarAdminAPI.deleteTimetable(id);
                  break;
                case 'override':
                  await calendarAdminAPI.deleteTimetableOverride(id);
                  break;
                case 'schedule':
                  await calendarAdminAPI.deletePersonalSchedule(id);
                  break;
                case 'export':
                  await calendarAdminAPI.deleteScheduleExport(id);
                  break;
                case 'account':
                  await calendarAdminAPI.deleteCalendarAccount(id);
                  break;
                case 'event':
                  await calendarAdminAPI.deleteSyncedEvent(id);
                  break;
              }
              Alert.alert('Success', 'Deleted successfully');
              onRefresh();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    try {
      return timeStr.substring(0, 5);
    } catch {
      return timeStr;
    }
  };

  const formatDetailLabel = (value: string) =>
    value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const formatDetailValue = (key: string, value: unknown) => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (key.includes('date')) {
      return formatDate(String(value));
    }
    if (key.includes('time')) {
      return formatTime(String(value));
    }
    return String(value);
  };

  const tabs: { key: CalendarTab; label: string; icon: string }[] = [
    { key: 'calendars', label: 'Calendars', icon: 'calendar' },
    { key: 'timetables', label: 'Timetables', icon: 'time' },
    { key: 'overrides', label: 'Overrides', icon: 'refresh' },
    { key: 'schedules', label: 'Schedules', icon: 'list' },
    { key: 'exports', label: 'Exports', icon: 'download' },
    { key: 'accounts', label: 'Accounts', icon: 'person' },
    { key: 'sync', label: 'Sync', icon: 'sync' },
    { key: 'events', label: 'Events', icon: 'calendar-outline' },
  ];

  const currentItems = (() => {
    switch (activeTab) {
      case 'calendars':
        return calendars;
      case 'timetables':
        return timetables;
      case 'overrides':
        return overrides;
      case 'schedules':
        return schedules;
      case 'exports':
        return exports;
      case 'accounts':
        return accounts;
      case 'sync':
        return syncSettings;
      case 'events':
        return events;
      default:
        return [];
    }
  })();

  const filteredItems = currentItems.filter((item: any) => {
    if (!searchQuery.trim()) {
      return true;
    }

    const haystack = Object.values(item)
      .flatMap((value) => (typeof value === 'object' && value !== null ? Object.values(value) : [value]))
      .filter((value) => value !== null && value !== undefined)
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchQuery.trim().toLowerCase());
  });

  const spotlight = {
    calendars: {
      title: 'Academic calendars',
      description: 'Control the official semester windows and active campus timeline.',
      metric: `${overview.calendars} total calendars`,
    },
    timetables: {
      title: 'Teaching timetable',
      description: 'Review scheduled sessions, rooms, and instructors across the week.',
      metric: `${overview.timetables} total timetable entries`,
    },
    overrides: {
      title: 'Override watchlist',
      description: 'Catch cancellations, reschedules, and extra classes before students miss them.',
      metric: `${overview.overrides} override records`,
    },
    schedules: {
      title: 'Personal schedules',
      description: 'See how institutional data mixes with student-created events and reminders.',
      metric: `${overview.schedules} personal schedule items`,
    },
    exports: {
      title: 'Schedule exports',
      description: 'Monitor synced calendar feeds and exported timetable subscriptions.',
      metric: `${overview.exports} export configurations`,
    },
    accounts: {
      title: 'Calendar accounts',
      description: 'Track connected Google, Microsoft, and external calendar identities.',
      metric: `${overview.accounts} linked calendar accounts`,
    },
    sync: {
      title: 'Sync settings',
      description: 'Confirm who is using auto-sync and how frequently calendar updates are pushed.',
      metric: `${overview.sync} sync preference profiles`,
    },
    events: {
      title: 'Synced events',
      description: 'Inspect what was actually pushed into external calendars and what was deleted.',
      metric: `${overview.events} synced events`,
    },
  }[activeTab];

  const renderCalendarItem = ({ item }: { item: AcademicCalendar }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedItem(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, item.is_active ? styles.activeText : styles.inactiveText]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>{item.year} - Semester {item.semester}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>{item.faculty_name || 'All faculties'}</Text>
        <Text style={styles.cardMeta}>{formatDate(item.start_date)} - {formatDate(item.end_date)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTimetableItem = ({ item }: { item: Timetable }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedItem(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.course_name || item.unit_code}</Text>
        <Text style={styles.cardType}>{item.type}</Text>
      </View>
      <Text style={styles.cardSubtitle}>
        {item.day} • {formatTime(item.start_time)} - {formatTime(item.end_time)}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>{item.building || 'Virtual'}{item.room ? ` - ${item.room}` : ''}</Text>
        <Text style={styles.cardMeta}>{item.instructor_name || '-'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderOverrideItem = ({ item }: { item: TimetableOverride }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedItem(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.timetable_info}</Text>
        <View style={[styles.typeBadge, item.override_type === 'cancelled' ? styles.cancelledBadge : 
          item.override_type === 'rescheduled' ? styles.rescheduledBadge : styles.extraBadge]}>
          <Text style={styles.typeText}>{item.override_type}</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>{formatDate(item.date)}</Text>
      {item.reason && <Text style={styles.cardDescription} numberOfLines={2}>{item.reason}</Text>}
    </TouchableOpacity>
  );

  const renderScheduleItem = ({ item }: { item: PersonalSchedule }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedItem(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardCategory}>{item.category}</Text>
      </View>
      <Text style={styles.cardSubtitle}>
        {item.user_name} • {formatDate(item.date)}
        {item.is_all_day ? ' (All day)' : ` • ${formatTime(item.start_time || '')} - ${formatTime(item.end_time || '')}`}
      </Text>
    </TouchableOpacity>
  );

  const renderExportItem = ({ item }: { item: ScheduleExport }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedItem(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.export_type}</Text>
        <View style={[styles.statusBadge, item.sync_enabled ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, item.sync_enabled ? styles.activeText : styles.inactiveText]}>
            {item.sync_enabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>{item.user_name}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>Last sync: {item.last_sync ? formatDate(item.last_sync) : 'Never'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderAccountItem = ({ item }: { item: CalendarAccount }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedItem(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.provider}</Text>
        <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, item.is_active ? styles.activeText : styles.inactiveText]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>{item.email}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>{item.user_name}</Text>
        <Text style={styles.cardMeta}>{item.last_sync_at ? formatDate(item.last_sync_at) : 'Never synced'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSyncItem = ({ item }: { item: SyncSettings }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedItem(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.user_name}</Text>
        <View style={[styles.statusBadge, item.auto_sync ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, item.auto_sync ? styles.activeText : styles.inactiveText]}>
            {item.auto_sync ? 'Auto-sync' : 'Manual'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>
        {item.sync_direction} • Every {item.sync_interval_minutes} minutes
      </Text>
    </TouchableOpacity>
  );

  const renderEventItem = ({ item }: { item: SyncedEvent }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedItem(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        {item.is_deleted && (
          <View style={styles.deletedBadge}>
            <Text style={styles.deletedText}>Deleted</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardSubtitle}>{item.calendar_account_info}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>
          {formatDate(item.start_time)} • {formatTime(item.start_time)} - {formatTime(item.end_time)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: any }) => {
    switch (activeTab) {
      case 'calendars': return renderCalendarItem({ item });
      case 'timetables': return renderTimetableItem({ item });
      case 'overrides': return renderOverrideItem({ item });
      case 'schedules': return renderScheduleItem({ item });
      case 'exports': return renderExportItem({ item });
      case 'accounts': return renderAccountItem({ item });
      case 'sync': return renderSyncItem({ item });
      case 'events': return renderEventItem({ item });
      default: return null;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading calendar data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar Management</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon 
                name={tab.icon as any} 
                size={18} 
                color={activeTab === tab.key ? colors.primary[500] : colors.text.tertiary} 
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.overviewStrip}
      >
        <View style={styles.overviewCard}>
          <Text style={styles.overviewValue}>{overview.calendars}</Text>
          <Text style={styles.overviewLabel}>Calendars</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewValue}>{overview.timetables}</Text>
          <Text style={styles.overviewLabel}>Timetables</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewValue}>{overview.accounts}</Text>
          <Text style={styles.overviewLabel}>Accounts</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewValue}>{overview.events}</Text>
          <Text style={styles.overviewLabel}>Events</Text>
        </View>
      </ScrollView>

      <View style={styles.spotlightCard}>
        <View style={styles.spotlightHeader}>
          <View>
            <Text style={styles.spotlightTitle}>{spotlight.title}</Text>
            <Text style={styles.spotlightMetric}>{spotlight.metric}</Text>
          </View>
          <View style={styles.spotlightChip}>
            <Text style={styles.spotlightChipText}>{tabs.find((tab) => tab.key === activeTab)?.label}</Text>
          </View>
        </View>
        <Text style={styles.spotlightDescription}>{spotlight.description}</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${tabs.find((tab) => tab.key === activeTab)?.label.toLowerCase() || 'calendar data'}...`}
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.resultCount}>
          Showing {filteredItems.length} of {currentItems.length} loaded {activeTab}
        </Text>
      </View>

      {/* Content */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item: any, index) => item?.id || `${activeTab}-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="calendar" size={64} color="#999999" />
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? `No ${activeTab.replace(/s$/, '')} matched "${searchQuery.trim()}"`
                : `No ${activeTab.replace(/s$/, '')} found`}
            </Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{spotlight.title} Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedItem && Object.entries(selectedItem).map(([key, value]) => (
                <View key={key} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{formatDetailLabel(key)}:</Text>
                  <Text style={styles.detailValue}>
                    {formatDetailValue(key, value)}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button
                title="Close"
                variant="outline"
                onPress={() => setShowDetailModal(false)}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Delete"
                variant="danger"
                onPress={() => {
                  setShowDetailModal(false);
                  if (selectedItem?.id) {
                    handleDelete(selectedItem.id, activeTab.replace(/s$/, ''));
                  }
                }}
                style={{ flex: 1 }}
              />
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
    backgroundColor: colors.background.primary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666666',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0D7377',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary[500],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  tabBar: {
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  overviewStrip: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  overviewCard: {
    minWidth: 108,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  overviewLabel: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text.secondary,
  },
  spotlightCard: {
    backgroundColor: colors.primary[500],
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  spotlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  spotlightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  spotlightMetric: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.86)',
  },
  spotlightChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  spotlightChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  spotlightDescription: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.86)',
  },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 15,
    color: colors.text.primary,
  },
  resultCount: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    marginLeft: spacing.xs,
    fontSize: 13,
    color: colors.text.tertiary,
  },
  activeTabText: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  cardCategory: {
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '500',
  },
  cardType: {
    fontSize: 12,
    color: colors.accent[500],
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  activeBadge: {
    backgroundColor: colors.success + '20',
  },
  inactiveBadge: {
    backgroundColor: colors.error + '20',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.error,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  cancelledBadge: {
    backgroundColor: colors.error + '20',
  },
  rescheduledBadge: {
    backgroundColor: colors.warning + '20',
  },
  extraBadge: {
    backgroundColor: colors.info + '20',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  deletedBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  deletedText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalBody: {
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    textTransform: 'capitalize',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});

export default CalendarManagementScreen;
