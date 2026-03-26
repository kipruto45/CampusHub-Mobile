// CreateInviteLinkSheet Component - Create new invite link
// CampusHub Mobile App

import React,{ useState } from 'react';
import { Modal,ScrollView,StyleSheet,Switch,Text,TextInput,TouchableOpacity,View } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';
import Icon from '../ui/Icon';
import { useToast } from '../ui/Toast';

interface CreateInviteLinkSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: CreateLinkData) => Promise<void>;
}

export interface CreateLinkData {
  expires_in_hours?: number;
  max_uses?: number;
  allow_auto_join?: boolean;
  notes?: string;
}

const EXPIRATION_OPTIONS = [
  { label: 'Never', value: 0 },
  { label: '1 Hour', value: 1 },
  { label: '6 Hours', value: 6 },
  { label: '12 Hours', value: 12 },
  { label: '1 Day', value: 24 },
  { label: '3 Days', value: 72 },
  { label: '7 Days', value: 168 },
  { label: '30 Days', value: 720 },
];

const MAX_USES_OPTIONS = [
  { label: 'Unlimited', value: 0 },
  { label: '5 uses', value: 5 },
  { label: '10 uses', value: 10 },
  { label: '25 uses', value: 25 },
  { label: '50 uses', value: 50 },
  { label: '100 uses', value: 100 },
];

export default function CreateInviteLinkSheet({ visible, onClose, onCreate }: CreateInviteLinkSheetProps) {
  const [loading, setLoading] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(0);
  const [maxUses, setMaxUses] = useState(0);
  const [allowAutoJoin, setAllowAutoJoin] = useState(true);
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();

  const handleCreate = async () => {
    setLoading(true);
    try {
      const data: CreateLinkData = {
        expires_in_hours: expiresInHours > 0 ? expiresInHours : undefined,
        max_uses: maxUses > 0 ? maxUses : undefined,
        allow_auto_join: allowAutoJoin,
        notes: notes.trim() || undefined,
      };
      
      await onCreate(data);
      resetForm();
      onClose();
    } catch (_error) {
      showToast('error', 'Failed to create invite link');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setExpiresInHours(0);
    setMaxUses(0);
    setAllowAutoJoin(true);
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Invite Link</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Expiration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Link Expiration</Text>
              <View style={styles.optionsGrid}>
                {EXPIRATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      expiresInHours === option.value && styles.optionSelected
                    ]}
                    onPress={() => setExpiresInHours(option.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      expiresInHours === option.value && styles.optionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Max Uses */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Maximum Uses</Text>
              <View style={styles.optionsGrid}>
                {MAX_USES_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      maxUses === option.value && styles.optionSelected
                    ]}
                    onPress={() => setMaxUses(option.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      maxUses === option.value && styles.optionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Auto Join Toggle */}
            <View style={styles.toggleSection}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Allow Auto-Join</Text>
                <Text style={styles.toggleDescription}>
                  Members can join instantly without approval
                </Text>
              </View>
              <Switch
                value={allowAutoJoin}
                onValueChange={setAllowAutoJoin}
                trackColor={{ false: colors.gray[300], true: colors.primary[300] }}
                thumbColor={allowAutoJoin ? colors.primary[500] : colors.gray[500]}
              />
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add a note for this link..."
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
                multiline
                maxLength={200}
              />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Icon name="information-circle" size={20} color={colors.info} />
              <Text style={styles.infoText}>
                Share this link with students you want to invite. The link will expire based on your settings or can be revoked at any time.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.createButton, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              <Icon name="link" size={18} color={colors.text.inverse} />
              <Text style={styles.createText}>
                {loading ? 'Creating...' : 'Create Link'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    padding: spacing[5],
  },
  section: {
    marginBottom: spacing[5],
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  optionButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  optionSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  optionText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: colors.text.inverse,
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[5],
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing[4],
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  notesInput: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: 15,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.lg,
    marginBottom: spacing[5],
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  cancelButton: {
    flex: 1,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  createButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
