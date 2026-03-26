/**
 * Audit Trail Visualization Screen
 * View and search admin activity logs
 */

import React,{ useCallback,useEffect,useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { adminManagementAPI } from '../../services/api';

interface AuditEntry {
  id: number;
  action: string;
  actor: string;
  target: string;
  details: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

const ACTION_ICONS: { [key: string]: string } = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  login: '🔑',
  logout: '🚪',
  approve: '✅',
  reject: '❌',
  moderate: '⚖️',
  export: '📤',
};

const ACTION_COLORS: { [key: string]: string } = {
  create: '#10B981',
  update: '#3B82F6',
  delete: '#EF4444',
  login: '#8B5CF6',
  logout: '#6B7280',
  approve: '#10B981',
  reject: '#EF4444',
  moderate: '#F59E0B',
  export: '#3B82F6',
};

export default function AuditLogScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchAuditLog = useCallback(async (reset: boolean = false, pageNum: number = 1) => {
    try {
      const currentPage = reset ? 1 : pageNum;

      const response = await adminManagementAPI.listAuditLogs({
        page: currentPage,
        ...(selectedFilter ? { action: selectedFilter } : {}),
      });
      const data = response?.data?.data ?? response?.data ?? {};
      const newEntries = Array.isArray(data?.results) ? data.results : [];

      if (reset) {
        setEntries(newEntries);
        setPage(2);
      } else {
        setEntries(prev => [...prev, ...newEntries]);
        setPage(currentPage + 1);
      }

      setHasMore(Boolean(data?.next) || newEntries.length >= 20);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchAuditLog(true);
  }, [fetchAuditLog]);

  useEffect(() => {
    fetchAuditLog(true);
  }, [fetchAuditLog]);

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchAuditLog(false, page);
    }
  };

  const filteredEntries = searchQuery
    ? entries.filter(entry =>
        entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.details?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  const getActionIcon = (action: string) => {
    for (const key of Object.keys(ACTION_ICONS)) {
      if (action.toLowerCase().includes(key)) {
        return ACTION_ICONS[key];
      }
    }
    return '📋';
  };

  const getActionColor = (action: string) => {
    for (const key of Object.keys(ACTION_COLORS)) {
      if (action.toLowerCase().includes(key)) {
        return ACTION_COLORS[key];
      }
    }
    return '#6B7280';
  };

  const filters = [
    { id: null, label: 'All' },
    { id: 'create', label: 'Created' },
    { id: 'update', label: 'Updated' },
    { id: 'delete', label: 'Deleted' },
    { id: 'login', label: 'Login' },
    { id: 'moderate', label: 'Moderation' },
  ];

  const renderEntry = ({ item }: { item: AuditEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={[styles.actionBadge, { backgroundColor: getActionColor(item.action) + '20' }]}>
          <Text style={styles.actionIcon}>{getActionIcon(item.action)}</Text>
          <Text style={[styles.actionText, { color: getActionColor(item.action) }]}>
            {item.action}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
      
      <View style={styles.entryBody}>
        <View style={styles.entryRow}>
          <Text style={styles.entryLabel}>Actor:</Text>
          <Text style={styles.entryValue}>{item.actor}</Text>
        </View>
        
        {item.target && (
          <View style={styles.entryRow}>
            <Text style={styles.entryLabel}>Target:</Text>
            <Text style={styles.entryValue} numberOfLines={1}>
              {item.target}
            </Text>
          </View>
        )}
        
        {item.details && (
          <View style={styles.entryRow}>
            <Text style={styles.entryLabel}>Details:</Text>
            <Text style={styles.entryValue} numberOfLines={2}>
              {item.details}
            </Text>
          </View>
        )}
        
        <View style={styles.entryFooter}>
          <Text style={styles.ipText}>IP: {item.ip_address || 'N/A'}</Text>
        </View>
      </View>
    </View>
  );

  if (loading && entries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search audit log..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.id || 'all'}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(item.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === item.id && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Audit Entries */}
      <FlatList
        data={filteredEntries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore && !refreshing ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No audit entries found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  entryBody: {
    gap: 8,
  },
  entryRow: {
    flexDirection: 'row',
  },
  entryLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 60,
  },
  entryValue: {
    fontSize: 13,
    color: '#1F2937',
    flex: 1,
  },
  entryFooter: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ipText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
