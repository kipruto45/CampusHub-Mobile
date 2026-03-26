// Quick Actions Sheet Component
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import Icon from '../ui/Icon';

interface QuickActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onUploadFile: () => void;
  onCreateFolder: () => void;
}

export const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({
  visible,
  onClose,
  onUploadFile,
  onCreateFolder,
}) => {
  if (!visible) return null;

  return (
    <>
      <TouchableOpacity 
        style={styles.overlay as ViewStyle} 
        activeOpacity={1} 
        onPress={onClose}
      />
      <View style={styles.container as ViewStyle}>
        <View style={styles.handle as ViewStyle} />
        
        <Text style={styles.title}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionItem as ViewStyle}
          onPress={() => {
            onUploadFile();
            onClose();
          }}
        >
          <View style={[styles.iconContainer as ViewStyle, { backgroundColor: colors.primary[50] }]}>
            <Icon name="cloud-upload" size={22} color={colors.primary[500]} />
          </View>
          <View style={styles.actionContent as ViewStyle}>
            <Text style={styles.actionTitle}>Upload File</Text>
            <Text style={styles.actionDescription}>
              Add PDF, documents, images, and more
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem as ViewStyle}
          onPress={() => {
            onCreateFolder();
            onClose();
          }}
        >
          <View style={[styles.iconContainer as ViewStyle, { backgroundColor: colors.accent[50] }]}>
            <Icon name="folder" size={22} color={colors.accent[500]} />
          </View>
          <View style={styles.actionContent as ViewStyle}>
            <Text style={styles.actionTitle}>Create Folder</Text>
            <Text style={styles.actionDescription}>
              Organize your files in folders
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  actionDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
