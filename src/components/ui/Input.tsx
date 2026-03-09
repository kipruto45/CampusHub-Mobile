// Input Component for CampusHub
// Modern, clean input field

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const getBorderColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.primary[500];
    return colors.border.light;
  };

  const handleTogglePassword = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View
        style={[
          styles.inputContainer,
          { borderColor: getBorderColor() },
          isFocused && styles.focused,
          error && styles.errorBorder,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            !!leftIcon && styles.inputWithLeftIcon,
            !!rightIcon && styles.inputWithRightIcon,
          ]}
          placeholderTextColor={colors.text.tertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...rest}
        />
        
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={handleTogglePassword}
            style={styles.rightIcon}
          >
            <Text style={styles.toggleText}>
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
          >
            {rightIcon}
          </TouchableOpacity>
        ) : null}
      </View>
      
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  focused: {
    ...shadows.soft,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 12,
    padding: 4,
  },
  toggleText: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '500',
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 6,
  },
});

export default Input;
