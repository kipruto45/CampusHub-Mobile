// Tooltip Component for CampusHub
// Simple tooltip with help information

import React,{ useState } from 'react';
import { Modal,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';
import Icon from './Icon';

interface TooltipProps {
  title: string;
  content: string;
  iconName?: 'information-circle' | 'help-circle' | 'alert-circle';
}

const Tooltip: React.FC<TooltipProps> = ({ title, content, iconName = 'information-circle' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <>
      <TouchableOpacity 
        onPress={() => setShowTooltip(true)}
        style={styles.helpIcon}
      >
        <Icon name={iconName} size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1}
          onPress={() => setShowTooltip(false)}
        >
          <View style={styles.tooltipContainer}>
            <View style={styles.tooltipHeader}>
              <Text style={styles.tooltipTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setShowTooltip(false)}>
                <Icon name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.tooltipContent}>{content}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  helpIcon: {
    padding: spacing[1],
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  tooltipContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    width: '100%',
    maxWidth: 320,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tooltipContent: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default Tooltip;
