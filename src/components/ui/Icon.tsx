// Custom Icon Component for CampusHub
// Uses real vector icons from Ionicons, MaterialCommunityIcons, and FontAwesome

import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';

type IconName = 
  // General
  | 'search'
  | 'add'
  | 'close'
  | 'menu'
  | 'settings'
  | 'back'
  | 'chevron-back'
  | 'chevron-forward'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'ellipsis-vertical'
  | 'checkmark'
  | 'cloud'
  | 'cloud-offline'
  | 'moon'
  | 'sunny'
  
  // Files & Folders
  | 'folder'
  | 'folder-outline'
  | 'folder-open'
  | 'document'
  | 'document-text'
  | 'image'
  | 'video'
  | 'musical-note'
  | 'archive'
  | 'file-tray'
  | 'file-tray-stacked'
  | 'download'
  | 'share'
  | 'send'
  | 'cloud-upload'
  | 'cloud-download'
  | 'home'
  | 'book'
  | 'folder'
  | 'bookmark'
  | 'person'
  | 'people'
  | 'person-circle'
  | 'log-out'
  | 'arrow-forward'
  | 'arrow-back'
  | 'arrow-down'
  | 'arrow-down-circle'
  | 'arrow-return-left'
  | 'megaphone'
  | 'notifications-off'
  | 'person-add'
  | 'ellipsis-horizontal'
  | 'pin-outline'
  | 'mail-unread'
  | 'close-circle'
  | 'bookmark-outline'
  | 'share-social'
  | 'ellipse'
  | 'cloud-done'
  | 'diamond'
  | 'warning'
  | 'checkmark-circle'
  | 'archive'
  | 'presentation'
  | 'shield-checkmark'
  
  // Actions
  | 'create'
  | 'trash'
  | 'pencil'
  | 'share-alt'
  | 'link'
  | 'copy'
  | 'move'
  | 'rename'
  | 'information-circle'
  | 'alert-circle'
  | 'warning'
  
  // Favorites & Stars
  | 'heart'
  | 'heart-outline'
  | 'star'
  | 'star-outline'
  | 'bookmark'
  | 'bookmark-outline'
  
  // Social & Users
  | 'person'
  | 'people'
  | 'person-circle'
  | 'chatbubbles'
  | 'chatbubble'
  | 'chatbubble-ellipses'
  | 'mail'
  | 'notifications'
  | 'globe'
  
  // Media
  | 'play'
  | 'pause'
  | 'skip-back'
  | 'skip-forward'
  | 'camera'
  | 'images'
  | 'mic'
  | 'headset'
  
  // Technology
  | 'phone'
  | 'laptop'
  | 'tablet-portrait'
  | 'wifi'
  | 'bluetooth'
  | 'flash'
  | 'battery'
  
  // Education & Learning
  | 'school'
  | 'book'
  | 'library'
  | 'journal'
  | 'bulb'
  | 'flask'
  | 'calculator'
  
  // Science & Nature
  | 'leaf'
  | 'planet'
  | 'fitness'
  | 'body'
  
  // Business & Office
  | 'briefcase'
  | 'clipboard'
  | 'pie-chart'
  | 'bar-chart'
  | 'trending-up'
  | 'analytics'
  
  // Time & Calendar
  | 'time'
  | 'calendar'
  | 'alarm'
  | 'hourglass'
  
  // Location
  | 'location'
  | 'map'
  | 'compass'
  
  // Misc
  | 'flag'
  | 'flame'
  | 'gear'
  | 'activity'
  | 'attach'
  | 'pricetag'
  | 'pin'
  | 'lock'
  | 'unlock'
  | 'eye'
  | 'eye-off'
  | 'code'
  | 'git-branch'
  | 'refresh'
  | 'sync'
  | 'filter'
  | 'sort'
  | 'grid'
  | 'list'
  | 'apps'
  | 'key'
  | 'shield'
  | 'finger-print'
  | 'qr-code'
  | 'barcode'
  | 'scan'
  | 'extension-puzzle'
  | 'dice'
  | 'game-controller'
  | 'gift'
  | 'ribbon'
  | 'ribbon-outline'
  | 'cart'
  | 'wallet'
  | 'card'
  | 'cash'
  | 'receipt'
  | 'printer'
  | 'scan-circle'
  | 'checkmark-circle'
  | 'close-circle'
  | 'help-circle'
  | 'information'
  | 'caret-up'
  | 'caret-down'
  | 'caret-forward'
  | 'caret-back'
  | 'add-circle'
  | 'remove-circle'
  | 'radio-button-on'
  | 'radio-button-off'
  | 'checkbox'
  | 'checkbox-outline'
  | 'square'
  | 'square-outline'
  | 'layers'
  | 'layers-outline'
  | 'cube'
  | 'construct'
  | 'server'
  | 'hardware-chip'
  | 'terminal'
  | 'wifi'
  | 'bluetooth'
  | 'cellular'
  | 'notifications-off'
  | 'notifications-outline'
  | 'call'
  | 'call-outline'
  | 'videocam'
  | 'videocam-outline'
  | 'volume-high'
  | 'volume-medium'
  | 'volume-low'
  | 'volume-mute'
  | 'volume-off'
  | 'mic-outline'
  | 'mic-off-outline'
  | 'ear'
  | 'eye-outline'
  | 'eye-off-outline'
  | 'color-palette'
  | 'color-fill'
  | 'brush'
  | 'spellcheck'
  | 'text'
  | 'text-outline'
  | 'logo-android'
  | 'logo-apple'
  | 'logo-windows'
  | 'logo-facebook'
  | 'logo-twitter'
  | 'logo-instagram'
  | 'logo-linkedin'
  | 'logo-youtube'
  | 'logo-google'
  | 'logo-microsoft'
  | 'logo-amazon'
  | 'logo-github'
  | 'logo-javascript'
  | 'logo-python'
  | 'logo-html5'
  | 'logo-css3'
  | 'logo-react'
  | 'logo-nodejs'
  | 'logo-android'
  | 'logo-apple'
  | 'logo-windows'
  | 'logo-tux'
  | 'logo-snapchat'
  | 'logo-pinterest'
  | 'logo-reddit'
  | 'logo-tiktok'
  | 'logo-soundcloud'
  | 'logo-skype'
  | 'logo-dribbble'
  | 'logo-behance'
  | 'logo-flickr'
  | 'logo-vimeo'
  | 'logo-wordpress'
  | 'logo-wordpress'
  | 'logo-steam'
  | 'logo-xbox'
  | 'logo-playstation'
  | 'logo-nintendo'
  
  // New Icons (from feedback)
  | 'google'
  | 'microsoft'
  | 'apple'
  | 'logo-google'
  | 'logo-microsoft'
  | 'logo-apple'
  | 'lock-closed'
  | 'lock-open'
  | 'ellipse-outline'
  | 'camera'
  | 'business'
  | 'bulb'
  | 'sparkles'

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: any;
}

// Icon mapping to convert emoji-style names to actual icon names
const getIconName = (name: string): string => {
  const iconMap: Record<string, string> = {
    // General
    'search': 'search',
    'add': 'add',
    'close': 'close',
    'menu': 'menu',
    'settings': 'settings',
    'back': 'chevron-back',
    'chevron-back': 'chevron-back',
    'chevron-forward': 'chevron-forward',
    'chevron-right': 'chevron-forward',
    'chevron-down': 'chevron-down',
    'chevron-up': 'chevron-up',
    'ellipsis-vertical': 'ellipsis-vertical',
    'checkmark': 'checkmark',
    'moon': 'moon',
    'sunny': 'sunny',
    
    // Files
    'folder': 'folder',
    'folder-outline': 'folder-outline',
    'folder-open': 'folder',
    'document': 'document',
    'document-text': 'document-text',
    'image': 'image',
    'video': 'videocam',
    'archive': 'archive',
    'file-tray': 'file-tray-stacked',
    'file-tray-stacked': 'file-tray-stacked',
    'download': 'download',
    'cloud-upload': 'cloud-upload',
    'cloud-download': 'cloud-download',
    'share': 'share-social',
    'send': 'send',
    'home': 'home',
    
    // Actions
    'create': 'add-circle',
    'trash': 'trash',
    'pencil': 'pencil',
    'rename': 'create',
    'information-circle': 'information-circle',
    'alert-circle': 'alert-circle',
    'warning': 'warning',
    
    // Favorites
    'heart': 'heart',
    'heart-outline': 'heart-outline',
    'star': 'star',
    'star-outline': 'star-outline',
    'bookmark': 'bookmark',
    'bookmark-outline': 'bookmark-outline',
    
    // Social
    'person': 'person',
    'people': 'people',
    'person-circle': 'person-circle',
    'chatbubbles': 'chatbubbles',
    'chatbubble': 'chatbubble-outline',
    'chatbubble-ellipses': 'chatbubble-ellipses',
    'mail': 'mail',
    'notifications': 'notifications',
    'globe': 'globe',
    'log-out': 'log-out',
    'arrow-forward': 'arrow-forward',
    'arrow-back': 'arrow-back',
    'arrow-down': 'arrow-down',
    'arrow-down-circle': 'arrow-down-circle',
    'arrow-return-left': 'arrow-undo',
    'megaphone': 'megaphone',
    'notifications-off': 'notifications-off',
    'person-add': 'person-add',
    'ellipsis-horizontal': 'ellipsis-horizontal',
    'pin-outline': 'pin-outline',
    'mail-unread': 'mail-unread',
    'close-circle': 'close-circle',
    'share-social': 'share-social',
    'ellipse': 'ellipse',
    'cloud-done': 'cloud-done',
    'diamond': 'diamond',
    'checkmark-circle': 'checkmark-circle',
    'presentation': 'presentation',
    'shield-checkmark': 'shield-checkmark',
    
    // Media
    'play': 'play',
    'pause': 'pause',
    'camera': 'camera',
    'images': 'images',
    'mic': 'mic',
    'headset': 'headset',
    
    // Education
    'school': 'school',
    'book': 'book',
    'library': 'library',
    'journal': 'journal',
    'bulb': 'bulb',
    'flask': 'flask',
    'calculator': 'calculator',
    
    // Business
    'briefcase': 'briefcase',
    'clipboard': 'clipboard',
    'pie-chart': 'pie-chart',
    'bar-chart': 'bar-chart',
    'trending-up': 'trending-up',
    'analytics': 'analytics',
    
    // Time
    'time': 'time',
    'calendar': 'calendar',
    'alarm': 'alarm',
    
    // Location
    'location': 'location',
    'map': 'map',
    'compass': 'compass',
    
    // Misc
    'flag': 'flag',
    'flame': 'flame',
    'gear': 'settings',
    'activity': 'pulse',
    'attach': 'attach',
    'pin': 'pin',
    'lock': 'lock-closed',
    'unlock': 'lock-open',
    'eye': 'eye',
    'eye-off': 'eye-off',
    'code': 'code-slash',
    'refresh': 'refresh',
    'sync': 'sync',
    'filter': 'filter',
    'sort': 'swap-vertical',
    'grid': 'grid',
    'list': 'list',
    'apps': 'apps',
    'key': 'key',
    'shield': 'shield-checkmark',
    'lock-closed': 'lock-closed',
    'lock-open': 'lock-open',
    'ellipse-outline': 'ellipse-outline',
    'business': 'business',
    'qr-code': 'qr-code',
    'barcode': 'barcode',
    'scan': 'scan',
    'gift': 'gift',
    'cart': 'cart',
    'wallet': 'wallet',
    'card': 'card',
    'cash': 'cash',
    'receipt': 'receipt',
    'printer': 'print',
    
    // Google, Microsoft, Apple
    'google': 'logo-google',
    'microsoft': 'logo-microsoft',
    'apple': 'logo-apple',
    'logo-google': 'logo-google',
    'logo-microsoft': 'logo-microsoft',
    'logo-apple': 'logo-apple',
  };
  
  return iconMap[name] || name;
};

// Determine which icon library to use
const getIconLibrary = (name: string): 'Ionicons' | 'MaterialCommunityIcons' | 'FontAwesome' => {
  // Use MaterialCommunityIcons for logos and specific icons
  if (name.startsWith('logo-')) {
    return 'Ionicons';
  }
  if (name === 'pin' || name === 'pin-outline') {
    return 'MaterialCommunityIcons';
  }
  if (name.includes('heart') || name.includes('star') || name.includes('bookmark')) {
    return 'Ionicons';
  }
  if (name.includes('folder') || name.includes('file') || name.includes('document')) {
    return 'Ionicons';
  }
  return 'Ionicons';
};

const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000', style }) => {
  const iconName = getIconName(name);
  const library = getIconLibrary(name);
  
  if (library === 'MaterialCommunityIcons') {
    return (
      <MaterialCommunityIcons 
        name={iconName as any} 
        size={size} 
        color={color} 
        style={style} 
      />
    );
  }
  
  return (
    <Ionicons 
      name={iconName as any} 
      size={size} 
      color={color} 
      style={style} 
    />
  );
};

export default Icon;

// Helper to get icon by file extension
export const getFileIcon = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: Record<string, string> = {
    // Documents
    'pdf': 'document-text',
    'doc': 'document',
    'docx': 'document',
    'txt': 'document',
    'rtf': 'document',
    'odt': 'document',
    
    // Spreadsheets
    'xls': 'grid',
    'xlsx': 'grid',
    'csv': 'grid',
    'ods': 'grid',
    
    // Presentations
    'ppt': 'presentation',
    'pptx': 'presentation',
    'odp': 'presentation',
    
    // Images
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'bmp': 'image',
    'svg': 'image',
    'webp': 'image',
    
    // Videos
    'mp4': 'videocam',
    'mov': 'videocam',
    'avi': 'videocam',
    'mkv': 'videocam',
    'webm': 'videocam',
    
    // Audio
    'mp3': 'musical-note',
    'wav': 'musical-note',
    'flac': 'musical-note',
    'aac': 'musical-note',
    
    // Archives
    'zip': 'archive',
    'rar': 'archive',
    '7z': 'archive',
    'tar': 'archive',
    'gz': 'archive',
    
    // Code
    'js': 'code-slash',
    'ts': 'code-slash',
    'py': 'code-slash',
    'java': 'code-slash',
    'cpp': 'code-slash',
    'c': 'code-slash',
    'html': 'code-slash',
    'css': 'code-slash',
    'json': 'code-slash',
    
    // Default
    'default': 'document',
  };
  
  return iconMap[ext] || 'document';
};
