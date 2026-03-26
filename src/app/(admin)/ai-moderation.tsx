/**
 * AI Content Moderation Screen
 * Manage AI-powered content moderation queue and analysis
 */

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { adminManagementAPI } from '../../services/api';

interface ModerationResource {
  id: string;
  title: string;
  description: string;
  uploaded_by: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  file_type: string;
  created_at: string;
  moderation_status: string;
}

interface ModerationStats {
  pending_count: number;
  flagged_count: number;
  pending: ModerationResource[];
  flagged: ModerationResource[];
}

interface ModerationResult {
  resource_id: string;
  resource_title: string;
  is_safe: boolean;
  risk_level: string;
  categories: string[];
  confidence_score: number;
  flagged_words: string[];
  recommendation: string;
}

const RISK_COLORS: { [key: string]: string } = {
  safe: '#10B981',
  low_risk: '#3B82F6',
  medium_risk: '#F59E0B',
  high_risk: '#EF4444',
  blocked: '#7F1D1D',
};

export default function AIModerationScreen() {
  const _router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'flagged'>('pending');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ModerationResult | null>(null);

  const fetchModerationQueue = useCallback(async () => {
    try {
      const response = await adminManagementAPI.getAIModerationQueue();
      const data = response?.data?.data ?? response?.data ?? {};
      setStats(data);
    } catch (error) {
      console.error('Error fetching moderation queue:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const runBatchModeration = async () => {
    Alert.alert(
      'Run Batch Moderation',
      'This will analyze all pending resources. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            try {
              const response = await adminManagementAPI.runAIModerationBatch();
              const data = response?.data?.data ?? response?.data ?? {};
              Alert.alert(
                'Batch Complete',
                `Approved: ${data.auto_approved}, Flagged: ${data.auto_flagged}, Blocked: ${data.auto_blocked}`
              );
              fetchModerationQueue();
            } catch (error) {
              console.error('Error running batch moderation:', error);
            }
          },
        },
      ]
    );
  };

  const analyzeResource = async (resourceId: string) => {
    setAnalyzingId(resourceId);
    setAnalysisResult(null);
    
    try {
      const response = await adminManagementAPI.analyzeResourceModeration(resourceId);
      const data = response?.data?.data ?? response?.data ?? {};
      setAnalysisResult(data);
    } catch (error) {
      console.error('Error analyzing resource:', error);
    } finally {
      setAnalyzingId(null);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchModerationQueue();
  }, [fetchModerationQueue]);

  useEffect(() => {
    fetchModerationQueue();
  }, [fetchModerationQueue]);

  const renderResource = ({ item }: { item: ModerationResource }) => {
    const isAnalyzing = analyzingId === item.id;
    
    return (
      <View style={styles.resourceCard}>
        <View style={styles.resourceHeader}>
          <Text style={styles.resourceTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.moderation_status}</Text>
          </View>
        </View>
        
        <Text style={styles.resourceDescription} numberOfLines={2}>
          {item.description || 'No description'}
        </Text>
        
        <View style={styles.resourceMeta}>
          <Text style={styles.metaText}>
            By: {item.uploaded_by?.first_name} {item.uploaded_by?.last_name}
          </Text>
          <Text style={styles.metaText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.resourceActions}>
          <TouchableOpacity
            style={[styles.actionButton, isAnalyzing && styles.actionButtonDisabled]}
            onPress={() => analyzeResource(item.id)}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Text style={styles.actionButtonText}>Analyze</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {analysisResult && analysisResult.resource_id === item.id && (
          <View style={styles.analysisResult}>
            <View style={styles.analysisHeader}>
              <View
                style={[
                  styles.riskBadge,
                  { backgroundColor: RISK_COLORS[analysisResult.risk_level] || '#6B7280' },
                ]}
              >
                <Text style={styles.riskText}>
                  {analysisResult.risk_level.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.confidenceText}>
                Confidence: {(analysisResult.confidence_score * 100).toFixed(0)}%
              </Text>
            </View>
            
            {analysisResult.flagged_words.length > 0 && (
              <View style={styles.flaggedWords}>
                <Text style={styles.flaggedLabel}>Flagged:</Text>
                <Text style={styles.flaggedText}>
                  {analysisResult.flagged_words.join(', ')}
                </Text>
              </View>
            )}
            
            <Text style={styles.recommendationText}>
              {analysisResult.recommendation}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const resources = selectedTab === 'pending' 
    ? stats?.pending || [] 
    : stats?.flagged || [];

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statCard, selectedTab === 'pending' && styles.statCardActive]}
          onPress={() => setSelectedTab('pending')}
        >
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {stats?.pending_count || 0}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, selectedTab === 'flagged' && styles.statCardActive]}
          onPress={() => setSelectedTab('flagged')}
        >
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {stats?.flagged_count || 0}
          </Text>
          <Text style={styles.statLabel}>Flagged</Text>
        </TouchableOpacity>
      </View>

      {/* Batch Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={runBatchModeration}
        >
          <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
            Run Auto-Moderation
          </Text>
        </TouchableOpacity>
      </View>

      {/* Resources List */}
      <FlatList
        data={resources}
        renderItem={renderResource}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No {selectedTab} resources
            </Text>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textTransform: 'capitalize',
  },
  resourceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  resourceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  resourceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  analysisResult: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confidenceText: {
    fontSize: 12,
    color: '#6B7280',
  },
  flaggedWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  flaggedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4,
  },
  flaggedText: {
    fontSize: 12,
    color: '#EF4444',
  },
  recommendationText: {
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
